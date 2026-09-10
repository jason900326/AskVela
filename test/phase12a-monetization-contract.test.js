import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const planPath = new URL("../components/VelaPlanSheet.js", import.meta.url);
const quickPath = new URL("../components/FreeQuickTarot.js", import.meta.url);
const deepPath = new URL("../components/VelaDeepReadingIntro.js", import.meta.url);
const experiencePath = new URL("../components/VelaExperience.js", import.meta.url);
const entryPath = new URL("../components/VelaPlusQuestionEntry.js", import.meta.url);
const flipPath = new URL("../components/VelaFlipPage.js", import.meta.url);
const flipCssPath = new URL("../app/phase12a-flip-pages.css", import.meta.url);

test("Phase 12A exposes Free, one-off Deep Reading, and Vela+ without stored value", async () => {
  const plan = await readFile(planPath, "utf8");

  assert.match(plan, /FREE/u);
  assert.match(plan, /DEEP READING/u);
  assert.match(plan, /NT\$29 \/ 次/u);
  assert.match(plan, /VELA\+/u);
  assert.match(plan, /不使用點數、錢包、儲值、充值或購買餘額/u);
  assert.doesNotMatch(plan, /credit_balance/u);
  assert.doesNotMatch(plan, /wallet_balance/u);
  assert.doesNotMatch(plan, /purchased_credits/u);
  assert.doesNotMatch(plan, /top_up/u);
});

test("Free and Vela+ share a free-form intake while Free still gives a complete one-card answer", async () => {
  const [experience, entry, quick, deep] = await Promise.all([
    readFile(experiencePath, "utf8"),
    readFile(entryPath, "utf8"),
    readFile(quickPath, "utf8"),
    readFile(deepPath, "utf8"),
  ]);

  assert.match(entry, /<textarea/u);
  assert.match(entry, /免費一張 · 約 60 秒 · 不需註冊/u);
  assert.match(entry, /\/api\/deep-reading\/intake/u);
  assert.match(experience, /<VelaPlusQuestionEntry onReady=\{handleHomeQuestionReady\} suggestions=\{FREE_QUESTION_PRESETS\} \/>/u);
  assert.match(experience, /homeSeed\.plan\.clarifyingQuestion/u);
  assert.match(experience, /option\.focusQuestion/u);
  assert.match(quick, /result\.synthesis\?\.overview/u);
  assert.match(quick, /card\.contextInterpretation/u);
  assert.match(quick, /card\.practicalFocus/u);
  assert.doesNotMatch(quick, /Free 體驗請先從 Vela 準備的題目裡選一個/u);
  assert.match(deep, /不需要你先選牌陣/u);
  assert.match(deep, /繼續聊這件事/u);
  assert.match(deep, /補一張/u);
});

test("one-card result finishes before a transparent NT$29 Deep Reading offer appears", async () => {
  const quick = await readFile(quickPath, "utf8");

  assert.match(quick, /剛才這一張已經完整回答/u);
  assert.match(quick, /DEEP READING · NT\$29 \/ 次/u);
  assert.match(quick, /完整 Deep Reading · NT\$29/u);
  assert.match(quick, /不會把已經做完的答案鎖起來/u);
  assert.match(quick, /onClick=\{onOpenPlans\}/u);
});

test("the product keeps a persistent plan entry without turning the home intake into an ad", async () => {
  const [experience, entry] = await Promise.all([
    readFile(experiencePath, "utf8"),
    readFile(entryPath, "utf8"),
  ]);

  assert.match(experience, /velaPlusStoreButton/u);
  assert.match(experience, /setPlanOpen\(true\)/u);
  assert.doesNotMatch(entry, /VELA\+/u);
  assert.doesNotMatch(entry, /NT\$29/u);
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

test("Free and Deep Reading keep their bounded flip-page language", async () => {
  const [experience, quick, deep, flip, css] = await Promise.all([
    readFile(experiencePath, "utf8"),
    readFile(quickPath, "utf8"),
    readFile(deepPath, "utf8"),
    readFile(flipPath, "utf8"),
    readFile(flipCssPath, "utf8"),
  ]);

  assert.match(experience, /VelaFlipPage/u);
  assert.match(quick, /step=\{5\} total=\{5\}/u);
  assert.match(deep, /const total = 7/u);
  assert.match(deep, /step=\{1\} total=\{total\}/u);
  assert.match(deep, /step=\{7\} total=\{total\}/u);
  assert.match(flip, /velaFlipProgress/u);
  assert.match(css, /@keyframes velaPageTurnIn/u);
  assert.match(css, /perspective:\s*1200px/u);
  assert.match(css, /prefers-reduced-motion/u);
});
