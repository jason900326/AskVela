import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const planPath = new URL("../components/VelaPlanSheet.js", import.meta.url);
const quickPath = new URL("../components/FreeQuickTarot.js", import.meta.url);
const deepPath = new URL("../components/VelaDeepReadingIntro.js", import.meta.url);
const experiencePath = new URL("../components/VelaExperience.js", import.meta.url);
const flipPath = new URL("../components/VelaFlipPage.js", import.meta.url);
const flipCssPath = new URL("../app/phase12a-flip-pages.css", import.meta.url);

test("Phase 12A exposes Free and Vela+ without a wallet or recharge model", async () => {
  const plan = await readFile(planPath, "utf8");

  assert.match(plan, /FREE/u);
  assert.match(plan, /VELA\+/u);
  assert.match(plan, /AskVela 不使用點數、錢包、儲值或充值制度/u);
  assert.doesNotMatch(plan, /credit_balance/u);
  assert.doesNotMatch(plan, /wallet_balance/u);
  assert.doesNotMatch(plan, /purchased_credits/u);
  assert.doesNotMatch(plan, /top_up/u);
});

test("Free remains full-quality while product depth and free-form questions are reserved for Vela+", async () => {
  const [plan, quick, deep] = await Promise.all([
    readFile(planPath, "utf8"),
    readFile(quickPath, "utf8"),
    readFile(deepPath, "utf8"),
  ]);

  assert.match(plan, /完整回答，不把免費版做成比較笨的 Vela/u);
  assert.match(plan, /自由輸入自己的問題，不受預設題目限制/u);
  assert.match(quick, /result\.synthesis\?\.overview/u);
  assert.match(quick, /card\.contextInterpretation/u);
  assert.match(quick, /card\.practicalFocus/u);
  assert.match(quick, /FREE_QUESTION_PRESETS/u);
  assert.doesNotMatch(quick, /<textarea/u);
  assert.match(deep, /不用你先選牌陣/u);
  assert.match(deep, /繼續聊這件事/u);
  assert.match(deep, /補一張/u);
});

test("the product has both a persistent plan entry and contextual upgrade entry", async () => {
  const [experience, quick] = await Promise.all([
    readFile(experiencePath, "utf8"),
    readFile(quickPath, "utf8"),
  ]);

  assert.match(experience, /velaPlusStoreButton/u);
  assert.match(experience, /setPlanOpen\(true\)/u);
  assert.match(quick, /onQuotaExhausted/u);
  assert.match(quick, /有一件事情，不是一張牌能說完的嗎？/u);
});

test("mobile quick-start advances directly from a preset instead of depending on typed form submit", async () => {
  const experience = await readFile(experiencePath, "utf8");

  assert.match(experience, /onClick=\{\(\) => startQuick\(item\)\}/u);
  assert.match(experience, /setExperience\("quick-tarot"\)/u);
  assert.match(experience, /FREE_QUESTION_PRESETS\.includes\(text\)/u);
  assert.doesNotMatch(experience, /<textarea/u);
  assert.doesNotMatch(experience, /onSubmit=\{submitQuick\}/u);
});

test("an active quick Tarot selection cannot be invalidated by a late quota sync", async () => {
  const quick = await readFile(quickPath, "utf8");
  const chooseCard = quick.slice(
    quick.indexOf("async function chooseCard"),
    quick.indexOf("async function revealAndInterpret"),
  );

  assert.match(chooseCard, /if \(loading\) return;/u);
  assert.doesNotMatch(chooseCard, /remaining\s*<=\s*0/u);
  assert.match(chooseCard, /setStage\("drawing"\)[\s\S]*fetch\("\/api\/readings\/draw"/u);
});

test("Free and Deep Reading share bounded flip-page language with their own stage counts", async () => {
  const [experience, quick, deep, flip, css] = await Promise.all([
    readFile(experiencePath, "utf8"),
    readFile(quickPath, "utf8"),
    readFile(deepPath, "utf8"),
    readFile(flipPath, "utf8"),
    readFile(flipCssPath, "utf8"),
  ]);

  assert.match(experience, /VelaFlipPage/u);
  assert.match(experience, /step=\{1\} total=\{5\}/u);
  assert.match(quick, /step=\{1\} total=\{5\}/u);
  assert.match(quick, /step=\{5\} total=\{5\}/u);
  assert.match(deep, /const total = 7/u);
  assert.match(deep, /step=\{1\} total=\{total\}/u);
  assert.match(deep, /step=\{7\} total=\{total\}/u);
  assert.match(flip, /velaFlipProgress/u);
  assert.match(css, /@keyframes velaPageTurnIn/u);
  assert.match(css, /perspective:\s*1200px/u);
  assert.match(css, /prefers-reduced-motion/u);
});
