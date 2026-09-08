import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const experiencePath = new URL("../components/VelaExperience.js", import.meta.url);
const astrologyFlowPath = new URL("../components/AstrologyReadingFlow.js", import.meta.url);
const astrologyRoutePath = new URL("../app/api/astrology/reading/route.js", import.meta.url);
const astrologyCssPath = new URL("../app/astrology.css", import.meta.url);
const accountCssPath = new URL("../app/account.css", import.meta.url);
const sourceStatusPath = new URL("../lib/astrology-source-status.js", import.meta.url);
const evidencePath = new URL("../lib/astrology-evidence.js", import.meta.url);

test("AskVela home is conversation-first instead of three equal mode tabs", async () => {
  const experience = await readFile(experiencePath, "utf8");

  assert.match(experience, /fortuneTellerStage/u);
  assert.match(experience, /今天想從哪件事開始/u);
  assert.match(experience, /讓 Vela 幫我選/u);
  assert.match(experience, /recommendExperience/u);
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
  assert.match(flow, /來源解讀已啟用/u);
  assert.match(flow, /sourceGrounded\s*!==\s*true/u);
  assert.match(flow, /參考來源/u);
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
