import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const experiencePath = new URL("../components/VelaExperience.js", import.meta.url);
const quickPath = new URL("../components/FreeQuickTarot.js", import.meta.url);
const deepPath = new URL("../components/VelaDeepReadingIntro.js", import.meta.url);
const cssPath = new URL("../app/phase12a-monetization-ui.css", import.meta.url);
const flipCssPath = new URL("../app/phase12a-flip-pages.css", import.meta.url);
const immersiveCssPath = new URL("../app/phase12a-immersive-tarot.css", import.meta.url);
const layoutPath = new URL("../app/layout.js", import.meta.url);

test("home lowers first-use friction with quick Tarot suggestions", async () => {
  const experience = await readFile(experiencePath, "utf8");

  assert.match(experience, /QUICK_SUGGESTIONS/u);
  assert.match(experience, /今天的我最需要注意什麼？/u);
  assert.match(experience, /最近的感情有什麼提醒？/u);
  assert.match(experience, /工作／學業現在最值得留意什麼？/u);
  assert.match(experience, /翻到選牌/u);
});

test("home quick-Tarot CTA is a direct button transition and remains a mobile hit target", async () => {
  const [experience, flipCss] = await Promise.all([
    readFile(experiencePath, "utf8"),
    readFile(flipCssPath, "utf8"),
  ]);

  assert.match(experience, /type="button" onClick=\{\(\) => startQuick\(question\)\}>翻到選牌/u);
  assert.doesNotMatch(experience, /<form className="phase12QuickForm"/u);
  assert.match(flipCss, /\.velaGuideHome \.phase12HomeFlipPage\s*\{[^}]*pointer-events:\s*auto;/su);
  assert.match(flipCss, /\.velaGuideHome \.phase12QuickForm \.primaryButton\s*\{[^}]*pointer-events:\s*auto;/su);
  assert.match(flipCss, /touch-action:\s*manipulation/u);
});

test("free quick Tarot is a one-card product with no free-form follow-up loop", async () => {
  const quick = await readFile(quickPath, "utf8");

  assert.match(quick, /const SPREAD_ID = "single-guidance"/u);
  assert.match(quick, /const DAILY_LIMIT = 3/u);
  assert.match(quick, /const ANONYMOUS_LIMIT = 1/u);
  assert.match(quick, /selectedCardIndexes: \[index\]/u);
  assert.match(quick, /Free 不開放同一題自由追問/u);
  assert.doesNotMatch(quick, /followUpMessage/u);
  assert.doesNotMatch(quick, /MAX_FOLLOW_UPS/u);
});

test("quick Tarot uses the real card back and visibly reveals the chosen face before interpretation", async () => {
  const [quick, immersiveCss, layout] = await Promise.all([
    readFile(quickPath, "utf8"),
    readFile(immersiveCssPath, "utf8"),
    readFile(layoutPath, "utf8"),
  ]);

  assert.match(quick, /CARD_BACK = "\/images\/vela\/tarot-card-back\.webp"/u);
  assert.match(quick, /immersiveRevealCard/u);
  assert.match(quick, /tarotImagePath\(card\)/u);
  assert.match(quick, /setRevealed\(true\)[\s\S]*await sleep\(1050\)[\s\S]*fetch\("\/api\/readings\/interpret"/u);
  assert.doesNotMatch(quick, /VelaWaitingStage/u);
  assert.doesNotMatch(quick, /quickBackButton/u);
  assert.match(immersiveCss, /\.immersiveRevealCard\.isFlipped \.immersiveCardInner\s*\{[^}]*rotateY\(180deg\)/su);
  assert.match(layout, /phase12a-immersive-tarot\.css/u);
});

test("quick Tarot stays on one mobile stage and limits scrolling to the result reading body", async () => {
  const immersiveCss = await readFile(immersiveCssPath, "utf8");

  assert.match(immersiveCss, /body:has\(\.immersiveQuickTarot\)\s*\{[^}]*overflow:\s*hidden;/su);
  assert.match(immersiveCss, /\.quickTarotExperience\.immersiveQuickTarot\s*\{[^}]*height:\s*100svh;[^}]*overflow:\s*hidden;/su);
  assert.match(immersiveCss, /\.immersiveResultScroll\s*\{[^}]*overflow-y:\s*auto;/su);
  assert.match(immersiveCss, /\.immersiveResultActions\s*\{[^}]*display:\s*grid;/su);
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
