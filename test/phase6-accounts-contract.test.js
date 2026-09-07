import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const accountPath = new URL("../components/VelaAccount.js", import.meta.url);
const flowPath = new URL("../components/TarotReadingFlow.js", import.meta.url);
const authPath = new URL("../lib/supabase-user.js", import.meta.url);
const browserAuthPath = new URL("../lib/supabase-browser.js", import.meta.url);
const historyPath = new URL("../lib/reading-history.js", import.meta.url);
const collectionRoutePath = new URL("../app/api/readings/history/route.js", import.meta.url);
const detailRoutePath = new URL("../app/api/readings/history/[readingId]/route.js", import.meta.url);
const migrationPath = new URL("../supabase/migrations/004_accounts_and_reading_history.sql", import.meta.url);

test("Phase 6 keeps login optional and transfers an active anonymous reading after auth", async () => {
  const [account, flow] = await Promise.all([
    readFile(accountPath, "utf8"),
    readFile(flowPath, "utf8"),
  ]);

  assert.match(account, /signInWithPassword/u);
  assert.match(account, /signUp/u);
  assert.match(account, /const activeEntry = activeAstrology \|\| activeReading/u);
  assert.match(account, /activeEntry && !user/u);
  assert.match(account, /method: "POST"/u);
  assert.match(account, /登入以保存/u);
  assert.match(flow, /<VelaAccount activeReading=\{activeReading\}/u);
  assert.match(flow, /stage !== "result"/u);
});

test("history API authenticates from a bearer token and never accepts a body user ID", async () => {
  const [auth, collectionRoute, detailRoute] = await Promise.all([
    readFile(authPath, "utf8"),
    readFile(collectionRoutePath, "utf8"),
    readFile(detailRoutePath, "utf8"),
  ]);

  assert.match(auth, /authorization/u);
  assert.match(auth, /auth\.getUser\(token\)/u);
  assert.match(collectionRoute, /getAuthenticatedSupabase\(request\)/u);
  assert.match(detailRoute, /getAuthenticatedSupabase\(request\)/u);
  assert.doesNotMatch(collectionRoute, /body\?\.userId/u);
  assert.doesNotMatch(detailRoute, /body\?\.userId/u);
});

test("Supabase Auth supports the current publishable key and the legacy anon fallback", async () => {
  const [browserAuth, serverAuth] = await Promise.all([
    readFile(browserAuthPath, "utf8"),
    readFile(authPath, "utf8"),
  ]);

  assert.match(browserAuth, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/u);
  assert.match(browserAuth, /NEXT_PUBLIC_SUPABASE_ANON_KEY/u);
  assert.match(serverAuth, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/u);
  assert.match(serverAuth, /NEXT_PUBLIC_SUPABASE_ANON_KEY/u);
});

test("history save verifies the deterministic draw before calling the atomic RPC", async () => {
  const [engine, route] = await Promise.all([
    readFile(historyPath, "utf8"),
    readFile(collectionRoutePath, "utf8"),
  ]);

  assert.match(engine, /createTarotDraw/u);
  assert.match(engine, /fixedDraw\.readingId !== readingId/u);
  assert.match(engine, /cardSignature\(result\.cards\)/u);
  assert.match(route, /rpc\("save_reading_history"/u);
});

test("history tables are RLS-isolated, user-controlled, and retention-bounded", async () => {
  const migration = await readFile(migrationPath, "utf8");

  assert.match(migration, /create table if not exists public\.readings/u);
  assert.match(migration, /create table if not exists public\.reading_cards/u);
  assert.match(migration, /create table if not exists public\.reading_messages/u);
  assert.match(migration, /enable row level security/u);
  assert.match(migration, /auth\.uid\(\)\) = user_id/u);
  assert.match(migration, /on delete cascade/u);
  assert.match(migration, /interval '365 days'/u);
  assert.match(migration, /security invoker/u);
});
