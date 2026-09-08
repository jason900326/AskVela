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
  basisNote: "以處女座的來源基準與當天實際太陽／月亮訊號做綜合；這不是完整出生星盤。",
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

test("structured astrology call receives scoped book evidence and forbids invented chart data", async () => {
  let call;
  const openai = { responses: { create: async (input) => { call = input; return { output_text: JSON.stringify(fakeOutput) }; } } };
  const reading = await createAstrologyReading({ signId: "virgo", period: "daily", localDate: "2026-09-07", timezone: "Asia/Taipei", requestId: "request-123" }, { openai, model: "test-model" });
  const payload = JSON.parse(call.input);

  assert.equal(reading.kind, "astrology");
  assert.equal(reading.sign.id, "virgo");
  assert.equal(reading.sourceGrounded, true);
  assert.ok(reading.sources.references.length >= 2);
  assert.ok(payload.sourceEvidence.some((item) => item.id === "sign-virgo" && item.scope === "natal_sun_sign"));
  assert.ok(payload.sourceEvidence.some((item) => item.id === "transit-method" && item.scope === "transit_method"));
  assert.ok(payload.sourceEvidence.some((item) => item.id === "natal-boundary" && item.scope === "application_boundary"));
  assert.match(call.instructions, /書中原則 → 當天天象 → 情境化延伸/u);
  assert.match(call.instructions, /不得捏造水星、金星、火星/u);
  assert.match(call.instructions, /不得把本命月亮/u);
  assert.equal(call.text.format.type, "json_schema");
  assert.equal(reading.result.practicalGuidance.length, 3);
});
