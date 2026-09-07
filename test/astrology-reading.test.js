import assert from "node:assert/strict";
import test from "node:test";
import {
  astrologyReadingId,
  AstrologyValidationError,
  createAstrologyReading,
  normalizeAstrologyRequest,
} from "../lib/astrology-reading.js";

const fakeOutput = {
  overview: "今天適合把注意力放回可整理的事情。",
  overall: "先辨認哪些事真的需要現在處理，節奏會比較清楚。",
  relationships: "關係上可以先確認彼此理解是否一致，不急著替對方下結論。",
  workStudy: "工作與學習適合切小步驟，先完成最能降低不確定性的部分。",
  energy: "留一點空白給自己調整，不必把每個變化都立刻變成任務。",
  practicalGuidance: ["先列三件最重要的事。", "有疑問時直接確認。", "晚上留一段不安排的時間。"],
  reflectionQuestion: "今天什麼事情其實可以不用一次做到完美？",
  basisNote: "主要參考近似太陽、月亮與月相訊號；這不是完整出生星盤。",
};

test("astrology request validates sign, period, date, timezone and request ID", () => {
  assert.throws(() => normalizeAstrologyRequest({ signId: "virgo", period: "monthly", localDate: "2026-09-07", timezone: "Asia/Taipei", requestId: "request-123" }), AstrologyValidationError);
  assert.throws(() => normalizeAstrologyRequest({ signId: "virgo", period: "daily", localDate: "2026-02-31", timezone: "Asia/Taipei", requestId: "request-123" }), AstrologyValidationError);
});

test("astrology reading ID is deterministic for an identical request", () => {
  const input = { signId: "virgo", period: "daily", localDate: "2026-09-07", timezone: "Asia/Taipei", requestId: "request-123" };
  const normalized = normalizeAstrologyRequest(input);
  assert.equal(astrologyReadingId(normalized), astrologyReadingId(normalized));
});

test("structured astrology call forbids invented natal chart data", async () => {
  let call;
  const openai = { responses: { create: async (input) => { call = input; return { output_text: JSON.stringify(fakeOutput) }; } } };
  const reading = await createAstrologyReading({ signId: "virgo", period: "daily", localDate: "2026-09-07", timezone: "Asia/Taipei", requestId: "request-123" }, { openai, model: "test-model" });
  assert.equal(reading.kind, "astrology");
  assert.equal(reading.sign.id, "virgo");
  assert.match(call.instructions, /不得捏造其他行星位置、出生星盤、宮位或相位/u);
  assert.equal(call.text.format.type, "json_schema");
  assert.equal(reading.result.practicalGuidance.length, 3);
});
