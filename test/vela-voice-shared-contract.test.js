import assert from "node:assert/strict";
import test from "node:test";
import { buildAstrologyInstructions } from "../lib/astrology-prompts.js";
import { buildDreamInstructions } from "../lib/dream-prompts.js";
import { buildLayerBInstructions, buildLayerCInstructions } from "../lib/reading-prompts.js";
import { buildVelaSharedVoiceInstructions } from "../lib/vela-voice.js";

const lowStakes = { isHighStakes: false, categories: [] };

test("all three launch modes share the same Vela voice core", () => {
  const shared = buildVelaSharedVoiceInstructions();
  const anchor = "先回答使用者真正卡住的點";
  assert.match(shared, new RegExp(anchor, "u"));
  assert.match(buildLayerBInstructions(lowStakes), new RegExp(anchor, "u"));
  assert.match(buildLayerCInstructions(lowStakes), new RegExp(anchor, "u"));
  assert.match(buildAstrologyInstructions(), new RegExp(anchor, "u"));
  assert.match(buildDreamInstructions(), new RegExp(anchor, "u"));
});

test("shared voice rejects performative human mimicry and polished AI symmetry", () => {
  const shared = buildVelaSharedVoiceInstructions();
  assert.match(shared, /主結果預設零次使用二分式反轉句/u);
  assert.match(shared, /不是 A，而是 B/u);
  assert.match(shared, /不要刻意模擬『正在思考的人』/u);
  assert.match(shared, /填充語、停頓、自我修正/u);
  assert.match(shared, /不要為了像人而故意做不完整句/u);
  assert.match(shared, /不要把同一種翻轉換一組連接詞再寫一次/u);
});

test("Astrology keeps methodology out of the main prose and avoids symmetric section templates", () => {
  const prompt = buildAstrologyInstructions();
  assert.match(prompt, /方法與限制集中放在 basisNote/u);
  assert.match(prompt, /避免『牡羊式』『雙魚式』『天秤擅長』/u);
  assert.match(prompt, /overview 是主結果的大標題/u);
  assert.match(prompt, /長短可以不一樣/u);
  assert.match(prompt, /天象 → 解釋 → 建議/u);
  assert.match(prompt, /不要逐段重複星座關鍵字/u);
});

test("Dream limits repetitive hedging, single-symbol overreach, body-state inference, and academic labels", () => {
  const prompt = buildDreamInstructions({ hasRetrievedPassages: true });
  assert.match(prompt, /每段通常一個不確定性標記就夠/u);
  assert.match(prompt, /不得直接宣稱它固定代表人生方向/u);
  assert.match(prompt, /不得因此推論『身體處在高警戒』『焦慮程度很高』/u);
  assert.match(prompt, /0–1 題即可/u);
  assert.match(prompt, /兩段不必同樣長/u);
  assert.match(prompt, /title 用平常人會說的短標籤/u);
  assert.match(prompt, /不要加入『嗯……』『我想一下』『我會先看這個』/u);
});
