import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

function requireValue(value, message) {
  const normalized = String(value || "").trim();
  if (!normalized) throw new Error(message);
  return normalized;
}

function assert(condition, message) {
  if (!condition) throw new Error(`Smoke test failed: ${message}`);
}

function localDateFor(timezone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${byType.year}-${byType.month}-${byType.day}`;
}

const baseUrl = requireValue(
  process.argv[2] || process.env.VELA_BASE_URL,
  "Set VELA_BASE_URL (for example https://your-production-domain.example) or pass the base URL as the first argument.",
).replace(/\/$/u, "");
const timezone = String(process.env.SMOKE_TIMEZONE || "Asia/Taipei").trim();
const localDate = String(process.env.SMOKE_LOCAL_DATE || localDateFor(timezone)).trim();
const requireFullDreamRag = process.env.SMOKE_REQUIRE_FULL_DREAM_RAG !== "0";
const allowApiOnly = process.env.SMOKE_ALLOW_API_ONLY === "1";

async function requestJson(path, { method = "GET", body, token } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    cache: "no-store",
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const raw = await response.text();
  let payload = {};
  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    throw new Error(`${method} ${path} returned non-JSON (${response.status}): ${raw.slice(0, 240)}`);
  }

  if (!response.ok) {
    throw new Error(`${method} ${path} failed (${response.status}): ${payload.error || raw || "unknown error"}`);
  }
  return payload;
}

function validateAstrology(reading, period) {
  assert(reading?.kind === "astrology", `${period} astrology response has the wrong kind.`);
  assert(/^astro_[0-9a-f]{32}$/u.test(String(reading?.readingId || "")), `${period} astrology reading ID is invalid.`);
  assert(reading?.period === period, `${period} astrology response changed the requested period.`);
  assert(reading?.sourceGrounded === true, `${period} astrology response is not source-grounded.`);
  assert(Array.isArray(reading?.sources) && reading.sources.length > 0, `${period} astrology response has no attributable sources.`);
  assert(String(reading?.result?.overview || "").trim(), `${period} astrology response has no overview.`);
}

function validateDream(reading) {
  assert(reading?.kind === "dream", "Dream response has the wrong kind.");
  assert(/^dream_[0-9a-f]{32}$/u.test(String(reading?.readingId || "")), "Dream reading ID is invalid.");
  assert(reading?.sourceGrounded === true, "Dream response is not source-grounded.");
  assert(Array.isArray(reading?.sources) && reading.sources.length > 0, "Dream response has no attributable sources.");
  assert(String(reading?.result?.overview || "").trim(), "Dream response has no overview.");
  if (requireFullDreamRag) {
    assert(reading?.sourceMode === "freud-full-book-rag", `Dream production source mode is ${reading?.sourceMode || "missing"}; Freud full-book RAG is required.`);
    assert(Array.isArray(reading?.retrievedSources) && reading.retrievedSources.length > 0, "Dream full-book RAG returned no retrieved passages.");
  }
}

async function authenticateSmokeUser() {
  const supabaseUrl = String(process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const publicKey = String(
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
      || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      || "",
  ).trim();
  const email = String(process.env.SMOKE_TEST_EMAIL || "").trim();
  const password = String(process.env.SMOKE_TEST_PASSWORD || "");

  if (!supabaseUrl || !publicKey || !email || !password) {
    if (allowApiOnly) return null;
    throw new Error(
      "Full production acceptance requires NEXT_PUBLIC_SUPABASE_URL, a Supabase publishable/anon key, SMOKE_TEST_EMAIL, and SMOKE_TEST_PASSWORD. Set SMOKE_ALLOW_API_ONLY=1 only for a partial API-only check.",
    );
  }

  const client = createClient(supabaseUrl, publicKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data?.session?.access_token) {
    throw new Error(`Smoke user sign-in failed: ${error?.message || "no access token"}`);
  }
  return { client, token: data.session.access_token, email };
}

console.log("=== AskVela production acceptance smoke ===");
console.log(`Base URL: ${baseUrl}`);
console.log(`Local date: ${localDate}`);
console.log(`Timezone: ${timezone}`);

const dailyAstrology = await requestJson("/api/astrology/reading", {
  method: "POST",
  body: {
    signId: "virgo",
    period: "daily",
    localDate,
    timezone,
    requestId: `smoke-astro-daily-${randomUUID()}`,
  },
});
validateAstrology(dailyAstrology, "daily");
console.log(`PASS astrology daily: ${dailyAstrology.readingId}`);

const weeklyAstrology = await requestJson("/api/astrology/reading", {
  method: "POST",
  body: {
    signId: "virgo",
    period: "weekly",
    localDate,
    timezone,
    requestId: `smoke-astro-weekly-${randomUUID()}`,
  },
});
validateAstrology(weeklyAstrology, "weekly");
console.log(`PASS astrology weekly: ${weeklyAstrology.readingId}`);

// Keep this intentionally short: the Dream product accepts one remembered image,
// so production history must also accept the same two-character input.
const dreamReading = await requestJson("/api/dreams/reading", {
  method: "POST",
  body: {
    dreamText: process.env.SMOKE_DREAM_TEXT || "火車",
    wakingLifeContext: "",
    requestId: `smoke-dream-${randomUUID()}`,
  },
});
validateDream(dreamReading);
console.log(`PASS dream reading: ${dreamReading.readingId} (${dreamReading.sourceMode})`);

const auth = await authenticateSmokeUser();
if (!auth) {
  console.log("PARTIAL PASS: reading APIs are healthy. History was skipped because SMOKE_ALLOW_API_ONLY=1.");
  process.exit(0);
}

console.log(`Authenticated smoke user: ${auth.email}`);
const cleanup = [];
try {
  const astrologySaved = await requestJson("/api/astrology/history", {
    method: "POST",
    body: dailyAstrology,
    token: auth.token,
  });
  assert(astrologySaved?.saved === true && astrologySaved?.readingId === dailyAstrology.readingId, "Astrology history save did not confirm the same reading ID.");
  cleanup.push({ kind: "astrology", id: dailyAstrology.readingId });

  const astrologyDetail = await requestJson(`/api/astrology/history/${dailyAstrology.readingId}`, { token: auth.token });
  assert(astrologyDetail?.reading?.readingId === dailyAstrology.readingId, "Astrology history detail did not restore the saved reading.");

  const dreamSaved = await requestJson("/api/dreams/history", {
    method: "POST",
    body: dreamReading,
    token: auth.token,
  });
  assert(dreamSaved?.saved === true && dreamSaved?.readingId === dreamReading.readingId, "Dream history save did not confirm the same reading ID.");
  cleanup.push({ kind: "dream", id: dreamReading.readingId });

  const dreamDetail = await requestJson(`/api/dreams/history/${dreamReading.readingId}`, { token: auth.token });
  assert(dreamDetail?.reading?.readingId === dreamReading.readingId, "Dream history detail did not restore the saved reading.");
  assert(dreamDetail?.reading?.dreamText === dreamReading.dreamText, "Dream history changed the short dream text during restore.");

  const [astrologyHistory, dreamHistory] = await Promise.all([
    requestJson("/api/astrology/history", { token: auth.token }),
    requestJson("/api/dreams/history", { token: auth.token }),
  ]);
  assert(astrologyHistory?.readings?.some((item) => item.readingId === dailyAstrology.readingId), "Astrology collection does not contain the smoke reading.");
  assert(dreamHistory?.readings?.some((item) => item.readingId === dreamReading.readingId), "Dream collection does not contain the smoke reading.");

  console.log("PASS private history: save, list, detail restore, RLS-authenticated access.");
} finally {
  for (const item of cleanup.reverse()) {
    try {
      await requestJson(`/api/${item.kind === "dream" ? "dreams" : "astrology"}/history/${item.id}`, {
        method: "DELETE",
        token: auth.token,
      });
      console.log(`CLEANUP ${item.kind}: ${item.id}`);
    } catch (error) {
      console.error(`Cleanup failed for ${item.kind} ${item.id}:`, error.message);
    }
  }
  await auth.client.auth.signOut();
}

console.log("PASS: Phase 8 production acceptance smoke completed successfully.");
