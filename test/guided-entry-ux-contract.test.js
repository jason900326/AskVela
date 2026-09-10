import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const experiencePath = new URL("../components/VelaExperience.js", import.meta.url);
const quickPath = new URL("../components/FreeQuickTarot.js", import.meta.url);
const deepPath = new URL("../components/VelaDeepReadingIntro.js", import.meta.url);
const planPath = new URL("../components/VelaPlanSheet.js", import.meta.url);
const cssPath = new URL("../app/phase12a-monetization-ui.css", import.meta.url);
const immersiveCssPath = new URL("../app/phase12a-immersive-tarot.css", import.meta.url);
const stabilityCssPath = new URL("../app/phase12a-mobile-stability.css", import.meta.url);
const deepPolishCssPath = new URL("../app/phase12a-deep-reading-polish.css", import.meta.url);
const sharePath = new URL("../lib/tarot-share-card.js", import.meta.url);

test("Free entry uses preset questions without inline upgrade advertising", async () => {
  const [experience, quick, plan] = await Promise.all([
    readFile(experiencePath, "utf8"),
    readFile(quickPath, "utf8"),
    readFile(planPath, "utf8"),
  ]);

  assert.match(experience, /FREE_QUESTION_PRESETS/u);
  assert.match(quick, /今天的我最需要注意什麼？/u);
  assert.match(quick, /最近的感情有什麼提醒？/u);
  assert.match(quick, /工作／學業現在最值得留意什麼？/u);
  assert.doesNotMatch(experience, /phase12FreePlusHint/u);
  assert.doesNotMatch(experience, /<strong>Deep Reading<\/strong>/u);
  assert.match(plan, /自由輸入自己的問題，不受預設題目限制/u);
});

test("Free home makes Astrology and Dream explicit secondary destinations without a carousel", async () => {
  const [experience, css] = await Promise.all([
    readFile(experiencePath, "utf8"),
    readFile(stabilityCssPath, "utf8"),
  ]);

  assert.match(experience, /<strong>星座運勢<\/strong>/u);
  assert.match(experience, /onClick=\{\(\) => changeExperience\("astrology"\)\}/u);
  assert.match(experience, /<strong>解夢<\/strong>/u);
  assert.match(experience, /onClick=\{\(\) => beginDream\(""\)\}/u);
  assert.match(css, /\.phase12SecondaryModes > div[\s\S]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/u);
  assert.doesNotMatch(css, /\.phase12SecondaryModes > div[\s\S]*overflow-x:\s*(auto|scroll)/u);
});

test("home preset questions advance directly into the one-card flow", async () => {
  const experience = await readFile(experiencePath, "utf8");

  assert.match(experience, /onClick=\{\(\) => startQuick\(item\)\}/u);
  assert.match(experience, /step=\{1\} total=\{5\}/u);
  assert.doesNotMatch(experience, /<form className="phase12QuickForm"/u);
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

test("confirmed card starts analysis immediately and skips the artificial chosen-card delay", async () => {
  const quick = await readFile(quickPath, "utf8");
  const chooseCard = quick.slice(
    quick.indexOf("async function chooseCard"),
    quick.indexOf("async function revealAndInterpret"),
  );

  assert.match(quick, /CARD_BACK = "\/images\/vela\/tarot-card-back\.webp"/u);
  assert.match(chooseCard, /createInterpretationPromise\(data, nextRequestId, index\);[\s\S]*setStage\("reveal"\);/u);
  assert.doesNotMatch(chooseCard, /1800/u);
  assert.doesNotMatch(quick, /這張牌已經選定/u);
  assert.match(quick, /牌已經在桌上/u);
  assert.match(quick, /interpretationPromiseRef\.current \|\| createInterpretationPromise/u);
});

test("Free result sharing generates a PNG file instead of copying plain text", async () => {
  const [quick, share] = await Promise.all([
    readFile(quickPath, "utf8"),
    readFile(sharePath, "utf8"),
  ]);

  assert.match(quick, /buildTarotSharePng/u);
  assert.match(quick, /shareTarotPng/u);
  assert.match(quick, /分享 PNG/u);
  assert.doesNotMatch(quick, /clipboard\.writeText/u);
  assert.match(share, /canvas\.toBlob/u);
  assert.match(share, /type: "image\/png"/u);
  assert.match(share, /navigator\.canShare/u);
  assert.match(share, /link\.download = filename/u);
});

test("quick Tarot stays viewport-bound except for a Safari-safe whole-result scroll surface", async () => {
  const [immersiveCss, stabilityCss] = await Promise.all([
    readFile(immersiveCssPath, "utf8"),
    readFile(stabilityCssPath, "utf8"),
  ]);

  assert.match(immersiveCss, /body:has\(\.immersiveQuickTarot\)\s*\{[^}]*overflow:\s*hidden;/su);
  assert.match(immersiveCss, /\.quickTarotExperience\.immersiveQuickTarot\s*\{[^}]*height:\s*100svh;[^}]*overflow:\s*hidden;/su);
  assert.match(stabilityCss, /body:has\(\.immersiveQuickTarot\.stage-result\)[\s\S]*overflow-y:\s*auto\s*!important/u);
  assert.match(stabilityCss, /\.immersiveQuickTarot\.stage-result \.immersiveResultScroll[\s\S]*overflow:\s*visible\s*!important/u);
});

test("Deep Reading uses AI clarification, a Vela-designed three-lens plan, continuation, and optional clarifier", async () => {
  const deep = await readFile(deepPath, "utf8");

  assert.match(deep, /\/api\/deep-reading\/intake/u);
  assert.match(deep, /plan\.clarifyingQuestion/u);
  assert.match(deep, /plan\.options\.map/u);
  assert.match(deep, /selectedOption\.lenses\.map/u);
  assert.match(deep, /不需要你先選牌陣/u);
  assert.match(deep, /selectedIndexes\.length !== 3/u);
  assert.match(deep, /\/api\/readings\/draw/u);
  assert.match(deep, /\/api\/readings\/interpret/u);
  assert.match(deep, /\/api\/readings\/follow-up/u);
  assert.match(deep, /還卡著/u);
  assert.match(deep, /\/api\/readings\/clarifier/u);
  assert.doesNotMatch(deep, /三張牌｜/u);
  assert.doesNotMatch(deep, /五張牌｜/u);
});

test("Deep reveal is card-driven and never auto-leaves after the third flip", async () => {
  const [deep, polishCss] = await Promise.all([
    readFile(deepPath, "utf8"),
    readFile(deepPolishCssPath, "utf8"),
  ]);

  assert.match(deep, /function revealCard\(index\)/u);
  assert.match(deep, /onClick=\{\(\) => revealCard\(index\)\}/u);
  assert.match(deep, /revealedIndexes\.length === draw\.cards\.length/u);
  assert.match(deep, /讓 Vela 把三張牌放在一起看/u);
  assert.match(deep, /function beginInterpretation\(\)/u);
  assert.doesNotMatch(deep, /翻開第/u);
  assert.doesNotMatch(deep, /if \(next === 3\) setStage/u);
  assert.match(polishCss, /\.deepRevealTap\.isRevealed \.deepRevealFlipInner/u);
  assert.match(polishCss, /rotateY\(180deg\)/u);
});

test("Deep waiting view rotates one message, keeps visible motion, and waits long enough to be seen", async () => {
  const [deep, polishCss] = await Promise.all([
    readFile(deepPath, "utf8"),
    readFile(deepPolishCssPath, "utf8"),
  ]);

  assert.match(deep, /DEEP_WAITING_LINES/u);
  assert.match(deep, /WAITING_MIN_MS = 2800/u);
  assert.match(deep, /WAITING_LINE_MS = 1200/u);
  assert.match(deep, /window\.setInterval/u);
  assert.match(deep, /aria-live="polite"/u);
  assert.match(deep, /label="整理這次 Reading"/u);
  assert.doesNotMatch(deep, /我已經看到三張牌各自在說什麼了/u);
  assert.match(polishCss, /@keyframes deepWaitingFloat/u);
  assert.match(polishCss, /@keyframes deepWaitingDriftA/u);
});

test("Deep result reuses draw metadata for card art and saves signed-in readings", async () => {
  const deep = await readFile(deepPath, "utf8");

  assert.match(deep, /function cardWithDrawMetadata/u);
  assert.match(deep, /const artCard = cardWithDrawMetadata\(card, draw, index\)/u);
  assert.match(deep, /tarotImagePath\(artCard\)/u);
  assert.match(deep, /const activeReading = useMemo/u);
  assert.match(deep, /kind: "tarot"/u);
  assert.match(deep, /<VelaAccount activeReading=\{activeReading\} experience="tarot" \/>/u);
});

test("Phase 12A entry surfaces are mobile-first", async () => {
  const css = await readFile(cssPath, "utf8");

  assert.match(css, /\.quickCardPool\s*\{[^}]*grid-template-columns:\s*repeat\(4/su);
  assert.match(css, /\.velaPlanGrid\s*\{[^}]*grid-template-columns:\s*1fr;/su);
  assert.match(css, /@media \(min-width: 720px\)[\s\S]*\.velaPlanGrid\s*\{\s*grid-template-columns:\s*1fr 1fr;/u);
  assert.match(css, /@media \(max-width: 420px\)/u);
});
