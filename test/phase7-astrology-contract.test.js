import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const paths = {
  flow: new URL("../components/AstrologyReadingFlow.js", import.meta.url),
  hub: new URL("../components/VelaExperience.js", import.meta.url),
  account: new URL("../components/VelaAccount.js", import.meta.url),
  accountCss: new URL("../app/account.css", import.meta.url),
  astrologyCss: new URL("../app/astrology.css", import.meta.url),
  sourceStatus: new URL("../lib/astrology-source-status.js", import.meta.url),
  prompt: new URL("../lib/astrology-prompts.js", import.meta.url),
  sky: new URL("../lib/astrology-sky.js", import.meta.url),
  route: new URL("../app/api/astrology/reading/route.js", import.meta.url),
  migration: new URL("../supabase/migrations/005_astrology_history.sql", import.meta.url),
};

test("Phase 7 keeps daily and weekly UI but blocks ungrounded astrology output", async () => {
  const [flow, sourceStatus, route] = await Promise.all([
    readFile(paths.flow, "utf8"),
    readFile(paths.sourceStatus, "utf8"),
    readFile(paths.route, "utf8"),
  ]);

  assert.match(flow, /ZODIAC_SIGNS/u);
  assert.match(flow, /今日運勢/u);
  assert.match(flow, /本週運勢/u);
  assert.match(flow, /不會保存生日/u);
  assert.match(flow, /ASTROLOGY_SOURCE_READY/u);
  assert.match(sourceStatus, /ASTROLOGY_SOURCE_READY = false/u);
  assert.match(route, /ASTROLOGY_SOURCES_NOT_READY/u);
  assert.match(route, /503/u);
});

test("astrology keeps deterministic sun/moon calculations but does not present them as a sourced reading", async () => {
  const [prompt, sky, route] = await Promise.all([
    readFile(paths.prompt, "utf8"),
    readFile(paths.sky, "utf8"),
    readFile(paths.route, "utf8"),
  ]);
  assert.match(prompt, /不得捏造其他行星位置、出生星盤、宮位或相位/u);
  assert.match(sky, /approximateSunLongitude/u);
  assert.match(sky, /approximateMoonLongitude/u);
  assert.doesNotMatch(sky, /fetch\(/u);
  assert.match(route, /ASTROLOGY_SOURCE_READY/u);
  assert.match(route, /createAstrologyReading/u);
});

test("Vela home starts with conversation and recommendation instead of three primary mode tabs", async () => {
  const hub = await readFile(paths.hub, "utf8");
  assert.match(hub, /fortuneTellerStage/u);
  assert.match(hub, /今天想從哪件事開始/u);
  assert.match(hub, /讓 Vela 幫我選/u);
  assert.match(hub, /recommendExperience/u);
  assert.match(hub, /解夢資料庫準備中/u);
  assert.doesNotMatch(hub, /experienceTabs/u);
});

test("account controls stay fixed at the top right and astrology result headline is compact on mobile", async () => {
  const [accountCss, astrologyCss] = await Promise.all([
    readFile(paths.accountCss, "utf8"),
    readFile(paths.astrologyCss, "utf8"),
  ]);
  assert.match(accountCss, /\.accountDock\s*\{[^}]*position:\s*fixed/isu);
  assert.match(accountCss, /right:\s*max\(/u);
  assert.match(astrologyCss, /\.astrologyResultHeader h2[^}]*clamp\(1\.45rem/isu);
  assert.match(astrologyCss, /\.astrologyResultHeader h2\s*\{\s*font-size:\s*1\.5rem/isu);
});

test("astrology history is private and remains in unified account history", async () => {
  const [account, migration] = await Promise.all([
    readFile(paths.account, "utf8"),
    readFile(paths.migration, "utf8"),
  ]);
  assert.match(account, /\/api\/astrology\/history/u);
  assert.match(account, /我的紀錄/u);
  assert.match(migration, /astrology_readings/u);
  assert.match(migration, /enable row level security/u);
  assert.match(migration, /auth\.uid\(\).*user_id/u);
  assert.match(migration, /interval '365 days'/u);
});
