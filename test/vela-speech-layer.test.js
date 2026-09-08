import assert from "node:assert/strict";
import test from "node:test";
import {
  buildTarotSpeechInput,
  buildVelaSpeechInstructions,
  normalizeVelaSpeech,
} from "../lib/vela-speech.js";

const safety = { isHighStakes: false, categories: [] };

test("speech renderer is a delivery layer, not another interpretation engine", () => {
  const instructions = buildVelaSpeechInstructions(safety);
  assert.match(instructions, /你現在不是分析引擎/u);
  assert.match(instructions, /只能重組輸入裡已經存在的意思/u);
  assert.match(instructions, /不要企圖把分析裡每一點都講完/u);
  assert.match(instructions, /禁止使用『不是 A，而是 B』/u);
  assert.match(instructions, /不要使用 bullet/u);
  assert.match(instructions, /0–1 次就夠/u);
  assert.match(instructions, /不要故意結巴、打錯字/u);
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
  assert.equal(result.usedFallback, true);
});
