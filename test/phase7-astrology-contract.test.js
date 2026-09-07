import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const paths = {
  flow: new URL("../components/AstrologyReadingFlow.js", import.meta.url),
  account: new URL("../components/VelaAccount.js", import.meta.url),
  prompt: new URL("../lib/astrology-prompts.js", import.meta.url),
  sky: new URL("../lib/astrology-sky.js", import.meta.url),
  route: new URL("../app/api/astrology/reading/route.js", import.meta.url),
  migration: new URL("../supabase/migrations/005_astrology_history.sql", import.meta.url),
};

test("Phase 7 provides daily and weekly functional astrology UI", async () => {
  const flow = await readFile(paths.flow, "utf8");
  assert.match(flow, /ZODIAC_SIGNS/u);
  assert.match(flow, /今日運勢/u);
  assert.match(flow, /本週運勢/u);
  assert.match(flow, /\/api\/astrology\/reading/u);
  assert.match(flow, /不會保存生日/u);
});

test("astrology is based on deterministic sun/moon signals, not invented horoscope data", async () => {
  const [prompt, sky, route] = await Promise.all([readFile(paths.prompt, "utf8"), readFile(paths.sky, "utf8"), readFile(paths.route, "utf8")]);
  assert.match(prompt, /不得捏造其他行星位置、出生星盤、宮位或相位/u);
  assert.match(sky, /approximateSunLongitude/u);
  assert.match(sky, /approximateMoonLongitude/u);
  assert.doesNotMatch(sky, /fetch\(/u);
  assert.match(route, /createAstrologyReading/u);
});

test("astrology history is private and joins the unified account history", async () => {
  const [account, migration] = await Promise.all([readFile(paths.account, "utf8"), readFile(paths.migration, "utf8")]);
  assert.match(account, /\/api\/astrology\/history/u);
  assert.match(account, /我的紀錄/u);
  assert.match(migration, /astrology_readings/u);
  assert.match(migration, /enable row level security/u);
  assert.match(migration, /auth\.uid\(\).*user_id/u);
  assert.match(migration, /interval '365 days'/u);
});
