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

test("shared voice prefers controlled human imperfection over polished AI symmetry", () => {
  const shared = buildVelaSharedVoiceInstructions();
  assert.match(shared, /不是 A，而是 B/u);
  assert.match(shared, /原則上最多出現一次/u);
  assert.match(shared, /0–2 次/u);
  assert.match(shared, /不完全收束/u);
  assert.match(shared, /輕微自我修正/u);
  assert.match(shared, /不要表演結巴/u);
  assert.match(shared, /輕微重複一句重點/u);
});

test("Astrology keeps methodology out of the main prose and avoids symmetric section templates", () => {
  const prompt = buildAstrologyInstructions();
  assert.match(prompt, /方法與限制集中放在 basisNote/u);
  assert.match(prompt, /避免『牡羊式』『雙魚式』『天秤擅長』/u);
  assert.match(prompt, /overview 是 Vela 開口講的第一句/u);
  assert.match(prompt, /長短可以不一樣/u);
  assert.match(prompt, /天象 → 解釋 → 建議/u);
  assert.match(prompt, /不要為了零重複而把文字壓成摘要/u);
});

test("Dream limits repetitive hedging, single-symbol overreach, body-state inference, and academic labels", () => {
  const prompt = buildDreamInstructions({ hasRetrievedPassages: true });
  assert.match(prompt, /每段通常一個不確定性標記就夠/u);
  assert.match(prompt, /不得直接宣稱它固定代表人生方向/u);
  assert.match(prompt, /不得因此推論『身體處在高警戒』『焦慮程度很高』/u);
  assert.match(prompt, /0–1 題即可/u);
  assert.match(prompt, /兩段不必同樣長/u);
  assert.match(prompt, /某種情緒的濃縮形象/u);
  assert.match(prompt, /不完全收束的觀察/u);
});
