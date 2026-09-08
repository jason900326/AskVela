import assert from "node:assert/strict";
import test from "node:test";
import {
  buildHighStakesSpeechFallback,
  buildTarotSpeechInput,
  buildVelaSpeechInstructions,
  normalizeVelaSpeech,
} from "../lib/vela-speech.js";

const safety = { isHighStakes: false, categories: [], notices: [] };

test("speech renderer is a delivery layer, not another interpretation engine", () => {
  const instructions = buildVelaSpeechInstructions(safety);
  assert.match(instructions, /你現在不是分析引擎/u);
  assert.match(instructions, /只能重組輸入裡已經存在的意思/u);
  assert.match(instructions, /不要企圖把分析裡每一點都講完/u);
  assert.match(instructions, /禁止使用『不是 A，而是 B』/u);
  assert.match(instructions, /他現在……/u);
  assert.match(instructions, /牌不能替對方回答/u);
  assert.match(instructions, /不要使用 bullet/u);
  assert.match(instructions, /0–1 次就夠/u);
  assert.match(instructions, /不要故意結巴、打錯字/u);
});

test("speech retry instructions become stricter without changing the analysis contract", () => {
  const instructions = buildVelaSpeechInstructions(safety, { retry: true });
  assert.match(instructions, /Speech Layer 的修正重試/u);
  assert.match(instructions, /完全避開工整對偶句/u);
  assert.match(instructions, /不替第三人稱陳述內在狀態/u);
});

test("speech renderer receives grounded analysis instead of raw source excerpts", () => {
  const input = buildTarotSpeechInput({
    reading: {
      question: "我最近要不要換工作？",
      spread: { id: "single-guidance", nameZhTw: "單張指引" },
    },
    cards: [{
      cardId: "four-of-swords",
      nameZhTw: "寶劍四",
      orientation: "upright",
      positionLabelZhTw: "指引",
      contextInterpretation: "先留一點恢復判斷力的空間。",
      practicalFocus: "先休息，再看去留。",
      sourceMeaning: "這個原典欄位不應直接送進 speech input。",
    }],
    synthesis: {
      overview: "先把疲累和去留拆開。",
      narrative: "長期緊繃可能讓離職念頭變得更急。",
      crossCardPattern: "",
      practicalGuidance: ["先休息"],
      reflectionQuestions: [],
    },
    safety,
  });

  assert.match(input, /先留一點恢復判斷力的空間/u);
  assert.match(input, /長期緊繃可能/u);
  assert.doesNotMatch(input, /這個原典欄位不應直接送進 speech input/u);
});

test("invalid speech shape falls back field-by-field to grounded synthesis", () => {
  const fallback = {
    overview: "原本 grounded overview",
    narrative: "原本 grounded narrative，這段內容足夠長，可以安全作為 fallback。",
  };
  const result = normalizeVelaSpeech({
    overview: "# 標題",
    narrative: "太短",
  }, fallback);

  assert.equal(result.overview, fallback.overview);
  assert.equal(result.narrative, fallback.narrative);
  assert.deepEqual(result.fallbackFields, ["overview", "narrative"]);
  assert.equal(result.usedFallback, true);
  assert.deepEqual(result.violations, ["format", "length"]);
});

test("polished contrast and unsupported third-party inner-state phrasing trigger a retry candidate", () => {
  const fallback = {
    overview: "先看互動本身。",
    narrative: "牌面只能提供互動上的可能性，不能替另一個人回答內心狀態。",
  };
  const result = normalizeVelaSpeech({
    overview: "真正的重點是先談清楚。",
    narrative: "他現在有一種不滿的感覺，所以你們需要先停一下再說。",
  }, fallback);

  assert.deepEqual(result.fallbackFields, ["overview", "narrative"]);
  assert.deepEqual(result.violations, ["polished-contrast", "third-party-inner-state"]);
  assert.equal(result.usedFallback, true);
});

test("one invalid speech field is reported as a partial fallback candidate", () => {
  const fallback = {
    overview: "原本 grounded overview",
    narrative: "原本 grounded narrative，這段內容足夠長，可以安全作為 fallback。",
  };
  const result = normalizeVelaSpeech({
    overview: "太短",
    narrative: "這段口語版有足夠長度，而且沒有使用標題或清單格式，所以應該保留下來。",
  }, fallback);

  assert.equal(result.overview, fallback.overview);
  assert.match(result.narrative, /這段口語版/u);
  assert.deepEqual(result.fallbackFields, ["overview"]);
  assert.equal(result.usedFallback, true);
});

test("high-stakes speech fallback never delegates a financial decision to tarot", () => {
  const result = buildHighStakesSpeechFallback({
    isHighStakes: true,
    categories: ["financial"],
    notices: ["若問題涉及投資或重大財務決策，請依可靠資料評估。"],
  });

  assert.match(result.overview, /不會用牌替你決定要不要賣/u);
  assert.match(result.narrative, /可靠資料/u);
  assert.match(result.narrative, /合格的專業人士/u);
  assert.equal(result.safeFallback, true);
  assert.equal(result.usedFallback, true);
});
