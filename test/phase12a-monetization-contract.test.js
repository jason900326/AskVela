import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const planPath = new URL("../components/VelaPlanSheet.js", import.meta.url);
const quickPath = new URL("../components/FreeQuickTarot.js", import.meta.url);
const deepPath = new URL("../components/VelaDeepReadingIntro.js", import.meta.url);
const experiencePath = new URL("../components/VelaExperience.js", import.meta.url);

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

test("Free remains full-quality while product depth is reserved for Vela+", async () => {
  const [plan, quick, deep] = await Promise.all([
    readFile(planPath, "utf8"),
    readFile(quickPath, "utf8"),
    readFile(deepPath, "utf8"),
  ]);

  assert.match(plan, /完整回答，不把免費版做成比較笨的 Vela/u);
  assert.match(quick, /result\.synthesis\?\.overview/u);
  assert.match(quick, /card\.contextInterpretation/u);
  assert.match(quick, /card\.practicalFocus/u);
  assert.match(deep, /決定閱讀結構/u);
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
