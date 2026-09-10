import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const paths = {
  flow: new URL("../components/AstrologyReadingFlowV2.js", import.meta.url),
  hub: new URL("../components/VelaExperience.js", import.meta.url),
  entry: new URL("../components/VelaPlusQuestionEntry.js", import.meta.url),
  account: new URL("../components/VelaAccount.js", import.meta.url),
  accountCss: new URL("../app/account.css", import.meta.url),
  astrologyCss: new URL("../app/astrology.css", import.meta.url),
  sourceStatus: new URL("../lib/astrology-source-status.js", import.meta.url),
  sourceCorpus: new URL("../lib/astrology-source-corpus.js", import.meta.url),
  evidence: new URL("../lib/astrology-evidence.js", import.meta.url),
  prompt: new URL("../lib/astrology-prompts.js", import.meta.url),
  sky: new URL("../lib/astrology-sky.js", import.meta.url),
  route: new URL("../app/api/astrology/reading/route.js", import.meta.url),
  history: new URL("../lib/astrology-history.js", import.meta.url),
  migration: new URL("../supabase/migrations/005_astrology_history.sql", import.meta.url),
};

test("Phase 7 enables astrology only with the bundled attributable source corpus", async () => {
  const [flow, sourceStatus, route, corpus] = await Promise.all([
    readFile(paths.flow, "utf8"),
    readFile(paths.sourceStatus, "utf8"),
    readFile(paths.route, "utf8"),
    readFile(paths.sourceCorpus, "utf8"),
  ]);

  assert.match(flow, /ZODIAC_SIGNS/u);
  assert.match(flow, /ASTROLOGY_SOURCE_READY/u);
  assert.match(flow, />今日</u);
  assert.match(flow, />本週</u);
  assert.match(flow, /getZodiacByBirthday/u);
  assert.match(flow, /sourceGrounded !== true/u);
  assert.match(flow, /查看完整星座分析與依據/u);
  assert.match(sourceStatus, /ASTROLOGY_SOURCE_READY = true/u);
  assert.match(route, /AstrologySourceError/u);
  assert.match(route, /503/u);
  assert.match(corpus, /Sepharial/u);
  assert.match(corpus, /Alan Leo/u);
  assert.match(corpus, /natal_sun_sign/u);
});

test("astrology uses actual Sun-Moon geometry and never fabricates a natal sign-center aspect", async () => {
  const [prompt, sky, evidence] = await Promise.all([
    readFile(paths.prompt, "utf8"),
    readFile(paths.sky, "utf8"),
    readFile(paths.evidence, "utf8"),
  ]);

  assert.match(sky, /approximateSunLongitude/u);
  assert.match(sky, /approximateMoonLongitude/u);
  assert.match(sky, /sunMoonAspect/u);
  assert.doesNotMatch(sky, /zodiacCenterLongitude/u);
  assert.doesNotMatch(sky, /aspectsToSunSign/u);
  assert.match(prompt, /本命月亮/u);
  assert.match(prompt, /sunMoonAspect/u);
  assert.match(prompt, /書中原則 → 當天天象 → 情境化延伸/u);
  assert.match(evidence, /transit-method/u);
  assert.match(evidence, /natal-boundary/u);
});

test("historical astrology claims are curated instead of copied as modern fact", async () => {
  const [corpus, prompt] = await Promise.all([
    readFile(paths.sourceCorpus, "utf8"),
    readFile(paths.prompt, "utf8"),
  ]);

  assert.match(corpus, /醫療診斷/u);
  assert.match(corpus, /死亡預言/u);
  assert.match(corpus, /性別本質論/u);
  assert.match(prompt, /歷史占星文本，不是現代醫學或科學證據/u);
  assert.match(prompt, /不要逐段重複星座關鍵字/u);
  assert.match(prompt, /不得沿用書中的醫療診斷/u);
});

test("Vela home stays Tarot-first with shared free-form intake while Astrology and Dream remain secondary", async () => {
  const [hub, entry] = await Promise.all([
    readFile(paths.hub, "utf8"),
    readFile(paths.entry, "utf8"),
  ]);
  assert.match(hub, /VelaStage/u);
  assert.match(hub, /velaHomeStageLayout/u);
  assert.match(hub, /VelaPlusQuestionEntry/u);
  assert.match(entry, /最近有什麼事一直放在心上？/u);
  assert.match(entry, /免費一張 · 約 60 秒 · 不需註冊/u);
  assert.match(hub, /FREE_QUESTION_PRESETS/u);
  assert.match(hub, /phase12SecondaryModes/u);
  assert.match(hub, /星座運勢/u);
  assert.match(hub, /changeExperience\("astrology"\)/u);
  assert.match(hub, /解夢/u);
  assert.match(hub, /beginDream\(""\)/u);
  assert.match(hub, /AstrologyReadingFlowV2/u);
  assert.match(hub, /DreamReadingFlowV2/u);
  assert.match(hub, /FreeQuickTarot/u);
  assert.doesNotMatch(hub, /解夢資料庫準備中/u);
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

test("astrology history recomputes evidence and remains private", async () => {
  const [account, history, migration] = await Promise.all([
    readFile(paths.account, "utf8"),
    readFile(paths.history, "utf8"),
    readFile(paths.migration, "utf8"),
  ]);
  assert.match(account, /\/api\/astrology\/history/u);
  assert.match(account, /我的紀錄/u);
  assert.match(history, /buildAstrologyEvidence/u);
  assert.match(history, /sourceGrounded/u);
  assert.match(migration, /astrology_readings/u);
  assert.match(migration, /enable row level security/u);
  assert.match(migration, /auth\.uid\(\).*user_id/u);
  assert.match(migration, /interval '365 days'/u);
});
