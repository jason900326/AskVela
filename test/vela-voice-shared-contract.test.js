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

test("Astrology keeps methodology out of the main prose and discourages fixed sign-personality phrasing", () => {
  const prompt = buildAstrologyInstructions();
  assert.match(prompt, /方法與限制集中放在 basisNote/u);
  assert.match(prompt, /避免『牡羊式』『雙魚式』『天秤擅長』/u);
  assert.match(prompt, /overview 只要 1 句/u);
  assert.match(prompt, /四區必須各自增加新資訊/u);
});

test("Dream limits repetitive hedging, single-symbol overreach, and unsupported body-state inference", () => {
  const prompt = buildDreamInstructions({ hasRetrievedPassages: true });
  assert.match(prompt, /每段通常一個不確定性標記就夠/u);
  assert.match(prompt, /不得直接宣稱它固定代表人生方向/u);
  assert.match(prompt, /不得因此推論『身體處在高警戒』『焦慮程度很高』/u);
  assert.match(prompt, /0–1 題即可/u);
});
