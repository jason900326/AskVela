import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const experiencePath = new URL("../components/VelaExperience.js", import.meta.url);
const quickPath = new URL("../components/FreeQuickTarot.js", import.meta.url);
const deepPath = new URL("../components/VelaDeepReadingIntro.js", import.meta.url);
const planPath = new URL("../components/VelaPlanSheet.js", import.meta.url);
const entryPath = new URL("../components/VelaPlusQuestionEntry.js", import.meta.url);
const helpPath = new URL("../components/VelaQuestionHelp.js", import.meta.url);
const cssPath = new URL("../app/phase12a-monetization-ui.css", import.meta.url);
const immersiveCssPath = new URL("../app/phase12a-immersive-tarot.css", import.meta.url);
const stabilityCssPath = new URL("../app/phase12a-mobile-stability.css", import.meta.url);
const deepPolishCssPath = new URL("../app/phase12a-deep-reading-polish.css", import.meta.url);
const readingPromptsPath = new URL("../lib/reading-prompts.js", import.meta.url);
const sharePath = new URL("../lib/tarot-share-card.js", import.meta.url);

test("home keeps the first question page focused on typing plus one help CTA", async () => {
  const [experience, entry] = await Promise.all([
    readFile(experiencePath, "utf8"),
    readFile(entryPath, "utf8"),
  ]);

  assert.match(experience, /<VelaPlusQuestionEntry/u);
  assert.match(experience, /onNeedHelp=\{\(\) => setHomeHelpOpen\(true\)\}/u);
  assert.match(entry, /<textarea/u);
  assert.match(entry, /免費一張 · 約 60 秒 · 不需註冊/u);
  assert.match(entry, /最近有什麼事一直放在心上？/u);
  assert.match(entry, /我不知道怎麼說/u);
  assert.doesNotMatch(entry, /不用先把問題想得很完整/u);
  assert.doesNotMatch(entry, /suggestions\.map/u);
  assert.doesNotMatch(entry, /NT\$29/u);
  assert.doesNotMatch(entry, /VELA\+/u);
});

test("guided choices live on the next page and start intake directly instead of filling the textarea", async () => {
  const [experience, help] = await Promise.all([
    readFile(experiencePath, "utf8"),
    readFile(helpPath, "utf8"),
  ]);

  assert.match(experience, /pageKey="home-help"/u);
  assert.match(experience, /<VelaQuestionHelp/u);
  assert.match(help, /GUIDED_CHOICES/u);
  assert.match(help, /onClick=\{\(\) => choose\(item\.question\)\}/u);
  assert.match(help, /\/api\/deep-reading\/intake/u);
  assert.match(help, /onReady\?\.\(\{ question, plan \}\)/u);
  assert.doesNotMatch(help, /setQuestion/u);
  assert.doesNotMatch(help, /<textarea/u);
});

test("Astrology and Dream move off the first entry page and remain available from question help", async () => {
  const [experience, entry, help] = await Promise.all([
    readFile(experiencePath, "utf8"),
    readFile(entryPath, "utf8"),
    readFile(helpPath, "utf8"),
  ]);

  assert.doesNotMatch(entry, /星座運勢/u);
  assert.doesNotMatch(entry, /解夢/u);
  assert.match(help, /星座運勢/u);
  assert.match(help, /解夢/u);
  assert.match(experience, /onAstrology=\{\(\) => changeExperience\("astrology"\)\}/u);
  assert.match(experience, /onDream=\{\(\) => beginDream\(""\)\}/u);
});

test("Free gets the AI clarification before entering its one-card reading", async () => {
  const [experience, entry] = await Promise.all([
    readFile(experiencePath, "utf8"),
    readFile(entryPath, "utf8"),
  ]);

  assert.match(entry, /\/api\/deep-reading\/intake/u);
  assert.match(experience, /homeSeed\.plan\.velaLine/u);
  assert.match(experience, /homeSeed\.plan\.clarifyingQuestion/u);
  assert.match(experience, /homeSeed\.plan\.options\.map/u);
  assert.match(experience, /startQuick\(option\.focusQuestion, seed\)/u);
  assert.match(experience, /這一張會完整回答，不會做到一半才鎖結果/u);
});

test("free quick Tarot accepts the focused custom question and has no free-form follow-up loop", async () => {
  const quick = await readFile(quickPath, "utf8");

  assert.match(quick, /const SPREAD_ID = "single-guidance"/u);
  assert.match(quick, /const DAILY_LIMIT = 3/u);
  assert.match(quick, /const ANONYMOUS_LIMIT = 1/u);
  assert.match(quick, /text\.length < 8 \|\| text\.length > 500/u);
  assert.match(quick, /selectedCardIndexes: \[index\]/u);
  assert.doesNotMatch(quick, /FREE_QUESTION_PRESETS\.includes\(text\)/u);
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

test("Free result sharing still generates an image while the user-facing action simply says share", async () => {
  const [quick, share] = await Promise.all([
    readFile(quickPath, "utf8"),
    readFile(sharePath, "utf8"),
  ]);

  assert.match(quick, /buildTarotSharePng/u);
  assert.match(quick, /shareTarotPng/u);
  assert.match(quick, /準備分享中/u);
  assert.match(quick, /shareLoading \? "準備分享中…" : "分享"/u);
  assert.doesNotMatch(quick, /分享 PNG<\/button>/u);
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

test("Deep waiting gives every visible line three seconds without forcing a long artificial wait", async () => {
  const [deep, polishCss] = await Promise.all([
    readFile(deepPath, "utf8"),
    readFile(deepPolishCssPath, "utf8"),
  ]);

  assert.match(deep, /DEEP_WAITING_LINES/u);
  assert.match(deep, /WAITING_MIN_MS = 3000/u);
  assert.match(deep, /WAITING_LINE_MS = 3200/u);
  assert.match(deep, /WAITING_LINE_MIN_VISIBLE_MS = 3000/u);
  assert.match(deep, /currentLineNeeds/u);
  assert.match(deep, /Math\.floor\(Math\.random\(\) \* DEEP_WAITING_LINES\.length\)/u);
  assert.match(deep, /三張牌有一個地方，比單看其中任何一張都更明顯/u);
  assert.match(deep, /有沒有哪張牌其實在反駁第一眼的直覺/u);
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

test("Deep synthesis pays off with a conclusion first and hides the longer reasoning", async () => {
  const [deep, polishCss, prompts] = await Promise.all([
    readFile(deepPath, "utf8"),
    readFile(deepPolishCssPath, "utf8"),
    readFile(readingPromptsPath, "utf8"),
  ]);

  assert.match(deep, /VELA 的結論/u);
  assert.match(deep, /真正值得注意的是/u);
  assert.match(deep, /接下來看這幾件事/u);
  assert.match(deep, /<details className="deepSynthesisReasoning">/u);
  assert.match(deep, /為什麼我會這樣看？/u);
  assert.doesNotMatch(deep, /<h2>三張牌放在一起<\/h2>/u);
  assert.match(polishCss, /\.deepVerdict h2/u);
  assert.match(polishCss, /\.deepReadingPrototype \.deepBackButton[\s\S]*display:\s*none\s*!important/u);
  assert.match(prompts, /Do NOT repeat those explanations card by card/u);
  assert.match(prompts, /overview is the conclusion/u);
  assert.match(prompts, /crossCardPattern is the reveal or turning point/u);
  assert.match(prompts, /only 2-4 sentences/u);
});

test("Phase 12A entry surfaces are mobile-first", async () => {
  const [css, sharedCss] = await Promise.all([
    readFile(cssPath, "utf8"),
    readFile(new URL("../app/phase12a-vela-plus-home.css", import.meta.url), "utf8"),
  ]);

  assert.match(css, /\.quickCardPool\s*\{[^}]*grid-template-columns:\s*repeat\(4/su);
  assert.match(css, /\.velaPlanGrid\s*\{[^}]*grid-template-columns:\s*1fr;/su);
  assert.match(sharedCss, /\.velaPlanGridThree[\s\S]*grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/u);
  assert.match(css, /@media \(max-width: 420px\)/u);
});
