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

const fakeSpeech = {
  overview: "今天先把步調放回自己手上。",
  narrative: "事情沒有少，只是不用一次全部處理。先挑一件最能降低混亂的事情做完，其他的晚一點再接也可以。關係上也差不多，先確認，不用急著猜。",
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

test("Astrology keeps grounded analysis separate from shared Vela speech", async () => {
  const calls = [];
  const openai = {
    responses: {
      create: async (input) => {
        calls.push(input);
        return { output_text: JSON.stringify(calls.length === 1 ? fakeOutput : fakeSpeech) };
      },
    },
  };
  const reading = await createAstrologyReading(
    { signId: "virgo", period: "daily", localDate: "2026-09-07", timezone: "Asia/Taipei", requestId: "request-123" },
    { openai, model: "test-model" },
  );
  const analysisPayload = JSON.parse(calls[0].input);
  const speechPayload = JSON.parse(calls[1].input);

  assert.equal(calls.length, 2);
  assert.equal(reading.kind, "astrology");
  assert.equal(reading.sign.id, "virgo");
  assert.equal(reading.sourceGrounded, true);
  assert.ok(reading.sources.references.length >= 2);
  assert.ok(analysisPayload.sourceEvidence.some((item) => item.id === "sign-virgo" && item.scope === "natal_sun_sign"));
  assert.ok(analysisPayload.sourceEvidence.some((item) => item.id === "transit-method" && item.scope === "transit_method"));
  assert.ok(analysisPayload.sourceEvidence.some((item) => item.id === "natal-boundary" && item.scope === "application_boundary"));
  assert.match(calls[0].instructions, /書中原則 → 當天天象 → 情境化延伸/u);
  assert.match(calls[0].instructions, /不得捏造水星、金星、火星/u);
  assert.match(calls[0].instructions, /不得把本命月亮/u);
  assert.equal(calls[0].text.format.type, "json_schema");
  assert.equal(calls[0].text.format.name, "askvela_astrology_reading");
  assert.equal(calls[1].text.format.name, "askvela_astrology_speech");
  assert.equal(calls[1].max_output_tokens, 460);
  assert.equal(speechPayload.groundedAnalysis.overview, fakeOutput.overview);
  assert.equal(speechPayload.sourceEvidence, undefined);
  assert.equal(reading.result.overview, fakeOutput.overview);
  assert.equal(reading.result.practicalGuidance.length, 3);
  assert.equal(reading.velaSpeech.status, "rendered");
  assert.equal(reading.velaSpeech.attempts, 1);
  assert.equal(reading.velaSpeech.overview, fakeSpeech.overview);
});
