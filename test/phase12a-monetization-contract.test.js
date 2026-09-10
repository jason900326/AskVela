import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const planPath = new URL("../components/VelaPlanSheet.js", import.meta.url);
const quickPath = new URL("../components/FreeQuickTarot.js", import.meta.url);
const deepPath = new URL("../components/VelaDeepReadingIntro.js", import.meta.url);
const experiencePath = new URL("../components/VelaExperience.js", import.meta.url);
const entryPath = new URL("../components/VelaPlusQuestionEntry.js", import.meta.url);
const helpPath = new URL("../components/VelaQuestionHelp.js", import.meta.url);
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

test("Free and Vela+ share a free-form intake while optional broad guidance skips AI", async () => {
  const [experience, entry, help, quick, deep] = await Promise.all([
    readFile(experiencePath, "utf8"),
    readFile(entryPath, "utf8"),
    readFile(helpPath, "utf8"),
    readFile(quickPath, "utf8"),
    readFile(deepPath, "utf8"),
  ]);

  assert.match(entry, /<textarea/u);
  assert.match(entry, /免費一張 · 約 60 秒 · 不需註冊/u);
  assert.match(entry, /\/api\/deep-reading\/intake/u);
  assert.match(entry, /我不知道怎麼說/u);
  assert.doesNotMatch(entry, /length < 8/u);
  assert.doesNotMatch(help, /\/api\/deep-reading\/intake/u);
  assert.match(help, /onChooseQuestion\?\.\(item\.question\)/u);
  assert.match(experience, /homeSeed\.plan\.clarifyingQuestion/u);
  assert.match(experience, /option\.focusQuestion/u);
  assert.match(experience, /onChooseQuestion=\{\(question\) => startQuick\(question\)\}/u);
  assert.match(quick, /result\.synthesis\?\.overview/u);
  assert.match(quick, /card\.contextInterpretation/u);
  assert.match(quick, /card\.practicalFocus/u);
  assert.doesNotMatch(quick, /Free 體驗請先從 Vela 準備的題目裡選一個/u);
  assert.match(deep, /不需要你先選牌陣/u);
  assert.match(deep, /繼續聊這件事/u);
  assert.match(deep, /補一張/u);
});

test("one-card result stays complete and mentions no price until the user opens plans", async () => {
  const quick = await readFile(quickPath, "utf8");

  assert.match(quick, /剛才這一張已經完整回答/u);
  assert.match(quick, /<span>深度解析<\/span>/u);
  assert.match(quick, />深度解析<\/button>/u);
  assert.doesNotMatch(quick, /DEEP READING · NT\$29 \/ 次/u);
  assert.doesNotMatch(quick, /完整 Deep Reading · NT\$29/u);
  assert.match(quick, /onClick=\{onOpenPlans\}/u);
});

test("Free and anonymous users cannot enter the full Deep prototype from plans", async () => {
  const [experience, plan] = await Promise.all([
    readFile(experiencePath, "utf8"),
    readFile(planPath, "utf8"),
  ]);

  assert.match(experience, /function startDeepReading[\s\S]*if \(!isVelaPlus\)[\s\S]*setPlanOpen\(true\);[\s\S]*return;/u);
  assert.match(experience, /if \(next === "deep" && !isVelaPlus\)[\s\S]*setPlanOpen\(true\)/u);
  assert.match(plan, /isVelaPlus \? "已包含在 Vela\+" : "即將開放"/u);
  assert.match(plan, /\{isVelaPlus \? \([\s\S]*onClick=\{onStartDeep\}>開始深度解析<\/button>/u);
  assert.doesNotMatch(plan, /預覽完整 Deep Reading/u);
  assert.doesNotMatch(plan, /先體驗 Vela\+ Reading/u);
  assert.doesNotMatch(plan, /目前按鈕只開啟產品原型/u);
});

test("the product keeps a persistent plan entry without pretending Free is Vela+", async () => {
  const [experience, entry] = await Promise.all([
    readFile(experiencePath, "utf8"),
    readFile(entryPath, "utf8"),
  ]);

  assert.match(experience, /velaPlusStoreButton/u);
  assert.match(experience, /isVelaPlus \? "✦ Vela\+" : "方案"/u);
  assert.match(experience, /isVelaPlus \? "isActivePlan" : "isPlanEntry"/u);
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
