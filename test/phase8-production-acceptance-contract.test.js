import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const dreamMigrationPath = new URL("../supabase/migrations/006_dream_history.sql", import.meta.url);
const verificationPath = new URL("../supabase/verification/phase8_history_check.sql", import.meta.url);
const smokePath = new URL("../scripts/smoke-production.js", import.meta.url);
const packagePath = new URL("../package.json", import.meta.url);

test("Dream history accepts the same minimum input length as the Dream reading API", async () => {
  const migration = await readFile(dreamMigrationPath, "utf8");
  assert.match(migration, /char_length\(dream_text\) between 2 and 4000/u);
  assert.doesNotMatch(migration, /char_length\(dream_text\) between 8 and 4000/u);
});

test("Phase 8 production verification checks both history tables, RLS, policies and retention", async () => {
  const verification = await readFile(verificationPath, "utf8");
  assert.match(verification, /astrology_readings/u);
  assert.match(verification, /dream_readings/u);
  assert.match(verification, /relrowsecurity/u);
  assert.match(verification, /pg_policies/u);
  assert.match(verification, /policy_count/u);
  assert.match(verification, /365 days/u);
  assert.match(verification, /dream_length_matches_api/u);
});

test("production smoke covers Astrology, Dream full-book RAG, authenticated history restore and cleanup", async () => {
  const [smoke, packageJson] = await Promise.all([
    readFile(smokePath, "utf8"),
    readFile(packagePath, "utf8"),
  ]);

  assert.match(smoke, /\/api\/astrology\/reading/u);
  assert.match(smoke, /period: "daily"/u);
  assert.match(smoke, /period: "weekly"/u);
  assert.match(smoke, /sources\?\.references/u);
  assert.doesNotMatch(smoke, /Array\.isArray\(reading\?\.sources\) && reading\.sources\.length > 0, `\$\{period\} astrology/u);
  assert.match(smoke, /\/api\/dreams\/reading/u);
  assert.match(smoke, /dreamText: process\.env\.SMOKE_DREAM_TEXT \|\| "火車"/u);
  assert.match(smoke, /freud-full-book-rag/u);
  assert.match(smoke, /signInWithPassword/u);
  assert.match(smoke, /\/api\/astrology\/history/u);
  assert.match(smoke, /\/api\/dreams\/history/u);
  assert.match(smoke, /method: "DELETE"/u);
  assert.match(packageJson, /"smoke:production"/u);
});
