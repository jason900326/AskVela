import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const experiencePath = new URL("../components/VelaExperience.js", import.meta.url);
const quickPath = new URL("../components/FreeQuickTarot.js", import.meta.url);
const deepPath = new URL("../components/VelaDeepReadingIntro.js", import.meta.url);
const planPath = new URL("../components/VelaPlanSheet.js", import.meta.url);
const cssPath = new URL("../app/phase12a-monetization-ui.css", import.meta.url);
const flipCssPath = new URL("../app/phase12a-flip-pages.css", import.meta.url);
const immersiveCssPath = new URL("../app/phase12a-immersive-tarot.css", import.meta.url);
const freeFixCssPath = new URL("../app/phase12a-free-flow-fixes.css", import.meta.url);
const layoutPath = new URL("../app/layout.js", import.meta.url);

test("Free entry uses preset questions instead of asking first-time users to type", async () => {
  const [experience, quick, plan] = await Promise.all([
    readFile(experiencePath, "utf8"),
    readFile(quickPath, "utf8"),
    readFile(planPath, "utf8"),
  ]);

  assert.match(experience, /FREE_QUESTION_PRESETS/u);
  assert.match(quick, /今天的我最需要注意什麼？/u);
  assert.match(quick, /最近的感情有什麼提醒？/u);
  assert.match(quick, /工作／學業現在最值得留意什麼？/u);
  assert.doesNotMatch(experience, /<textarea/u);
  assert.doesNotMatch(quick, /<textarea/u);
  assert.match(experience, /Free 體驗不用打字/u);
  assert.match(experience, /升級後可以自由描述/u);
  assert.match(plan, /自由輸入自己的問題，不受預設題目限制/u);
});

test("home preset questions advance directly into the one-card flow", async () => {
  const [experience, freeFixCss] = await Promise.all([
    readFile(experiencePath, "utf8"),
    readFile(freeFixCssPath, "utf8"),
  ]);

  assert.match(experience, /onClick=\{\(\) => startQuick\(item\)\}/u);
  assert.match(experience, /step=\{1\} total=\{5\}/u);
  assert.doesNotMatch(experience, /<form className="phase12QuickForm"/u);
  assert.match(freeFixCss, /\.phase12PresetGrid button[\s\S]*touch-action:\s*manipulation/u);
});

test("free quick Tarot is a preset one-card product with no free-form follow-up loop", async () => {
  const quick = await readFile(quickPath, "utf8");

  assert.match(quick, /const SPREAD_ID = "single-guidance"/u);
  assert.match(quick, /const DAILY_LIMIT = 3/u);
  assert.match(quick, /const ANONYMOUS_LIMIT = 1/u);
  assert.match(quick, /FREE_QUESTION_PRESETS\.includes\(text\)/u);
  assert.match(quick, /selectedCardIndexes: \[index\]/u);
  assert.doesNotMatch(quick, /followUpMessage/u);
  assert.doesNotMatch(quick, /MAX_FOLLOW_UPS/u);
});

test("quick Tarot uses the real card back and starts interpretation during the chosen-card interlude", async () => {
  const [quick, immersiveCss, freeFixCss, layout] = await Promise.all([
    readFile(quickPath, "utf8"),
    readFile(immersiveCssPath, "utf8"),
    readFile(freeFixCssPath, "utf8"),
    readFile(layoutPath, "utf8"),
  ]);

  assert.match(quick, /CARD_BACK = "\/images\/vela\/tarot-card-back\.webp"/u);
  assert.match(quick, /VELA_TAROT_ART = "\/images\/vela\/vela-tarot\.webp"/u);
  assert.match(quick, /createInterpretationPromise\(data, nextRequestId, index\)[\s\S]*await sleep\(Math\.max\(0, 1800 - elapsed\)\)[\s\S]*setStage\("reveal"\)/u);
  assert.match(quick, /interpretationPromiseRef\.current \|\| createInterpretationPromise/u);
  assert.match(quick, /immersiveLoginVela/u);
  assert.match(quick, /結果出來後，從右上角登入就能保存/u);
  assert.match(immersiveCss, /\.immersiveRevealCard\.isFlipped \.immersiveCardInner\s*\{[^}]*rotateY\(180deg\)/su);
  assert.match(freeFixCss, /\.immersiveLoginVela/u);
  assert.match(layout, /phase12a-free-flow-fixes\.css/u);
});

test("quick Tarot stays viewport-bound except for a Safari-safe whole-result scroll surface", async () => {
  const [immersiveCss, freeFixCss] = await Promise.all([
    readFile(immersiveCssPath, "utf8"),
    readFile(freeFixCssPath, "utf8"),
  ]);

  assert.match(immersiveCss, /body:has\(\.immersiveQuickTarot\)\s*\{[^}]*overflow:\s*hidden;/su);
  assert.match(immersiveCss, /\.quickTarotExperience\.immersiveQuickTarot\s*\{[^}]*height:\s*100svh;[^}]*overflow:\s*hidden;/su);
  assert.match(freeFixCss, /\.immersiveQuickTarot\.stage-result \.velaFlipPage\s*\{[^}]*transform:\s*none\s*!important;/su);
  assert.match(freeFixCss, /\.immersiveQuickTarot\.stage-result \.immersiveResultCard\s*\{[^}]*overflow-y:\s*auto\s*!important;[^}]*touch-action:\s*pan-y;/su);
  assert.match(freeFixCss, /\.immersiveQuickTarot\.stage-result \.immersiveResultHeader\s*\{[^}]*position:\s*sticky;/su);
  assert.match(freeFixCss, /\.immersiveQuickTarot\.stage-result \.immersiveResultActions\s*\{[^}]*position:\s*sticky;/su);
});

test("Deep Reading starts with clarification rather than a card-count picker", async () => {
  const deep = await readFile(deepPath, "utf8");

  assert.match(deep, /這次不用急著決定要抽幾張牌/u);
  assert.match(deep, /先告訴我，最近哪件事最讓你放不下？/u);
  assert.match(deep, /FRICTIONS/u);
  assert.match(deep, /我先不抽牌/u);
  assert.match(deep, /先整理矛盾 → 決定閱讀結構/u);
  assert.doesNotMatch(deep, /三張牌｜/u);
  assert.doesNotMatch(deep, /五張牌｜/u);
});

test("Phase 12A entry surfaces are mobile-first", async () => {
  const css = await readFile(cssPath, "utf8");

  assert.match(css, /\.quickCardPool\s*\{[^}]*grid-template-columns:\s*repeat\(4/su);
  assert.match(css, /\.velaPlanGrid\s*\{[^}]*grid-template-columns:\s*1fr;/su);
  assert.match(css, /@media \(min-width: 720px\)[\s\S]*\.velaPlanGrid\s*\{\s*grid-template-columns:\s*1fr 1fr;/u);
  assert.match(css, /@media \(max-width: 420px\)/u);
});
