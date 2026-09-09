import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const experiencePath = new URL("../components/VelaExperience.js", import.meta.url);
const velaStagePath = new URL("../components/VelaStage.js", import.meta.url);
const astrologyFlowPath = new URL("../components/AstrologyReadingFlowV2.js", import.meta.url);
const astrologyRoutePath = new URL("../app/api/astrology/reading/route.js", import.meta.url);
const astrologyCssPath = new URL("../app/astrology.css", import.meta.url);
const accountCssPath = new URL("../app/account.css", import.meta.url);
const sourceStatusPath = new URL("../lib/astrology-source-status.js", import.meta.url);
const evidencePath = new URL("../lib/astrology-evidence.js", import.meta.url);

test("AskVela home is Tarot-first instead of exposing equal mode tabs", async () => {
  const [experience, velaStage] = await Promise.all([
    readFile(experiencePath, "utf8"),
    readFile(velaStagePath, "utf8"),
  ]);

  assert.match(experience, /VelaStage/u);
  assert.match(experience, /velaHomeStageLayout/u);
  assert.match(velaStage, /velaCrystalButton/u);
  assert.match(velaStage, /onCrystalClick/u);
  assert.match(experience, /先讓 Vela 看一個小問題。/u);
  assert.match(experience, /抽一張牌/u);
  assert.match(experience, /FREE_QUESTION_PRESETS/u);
  assert.match(experience, /phase12SecondaryJourneys/u);
  assert.match(experience, /Deep Reading/u);
  assert.doesNotMatch(experience, /className="experienceTabs"/u);
});

test("astrology is enabled only through canonical evidence and still refuses missing evidence", async () => {
  const [flow, route, status, evidence] = await Promise.all([
    readFile(astrologyFlowPath, "utf8"),
    readFile(astrologyRoutePath, "utf8"),
    readFile(sourceStatusPath, "utf8"),
    readFile(evidencePath, "utf8"),
  ]);

  assert.match(status, /ASTROLOGY_SOURCE_READY\s*=\s*true/u);
  assert.match(flow, /ASTROLOGY_SOURCE_READY/u);
  assert.match(flow, /sourceGrounded !== true/u);
  assert.match(flow, /這次星座解讀沒有通過來源驗證/u);
  assert.match(flow, /查看完整星座分析與依據/u);
  assert.match(route, /AstrologySourceError/u);
  assert.match(route, /503/u);
  assert.match(evidence, /sufficient/u);
});

test("astrology result headline is constrained and account controls stay fixed top-right", async () => {
  const [astrologyCss, accountCss] = await Promise.all([
    readFile(astrologyCssPath, "utf8"),
    readFile(accountCssPath, "utf8"),
  ]);

  assert.match(astrologyCss, /\.astrologyResultHeader h2[^\n]*clamp\(1\.45rem,3\.2vw,2\.15rem\)/u);
  assert.match(accountCss, /\.accountDock\s*\{[^}]*position:\s*fixed;/su);
  assert.match(accountCss, /right:\s*max\(/u);
  assert.match(accountCss, /z-index:\s*80/u);
});
