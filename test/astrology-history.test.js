import assert from "node:assert/strict";
import test from "node:test";
import {
  astrologyHistoryRowToSnapshot,
  astrologyHistoryRowToSummary,
  normalizeAstrologyHistorySnapshot,
} from "../lib/astrology-history.js";
import { astrologyReadingId, normalizeAstrologyRequest } from "../lib/astrology-reading.js";

const result = {
  overview: "overview",
  overall: "overall",
  relationships: "relationships",
  workStudy: "workStudy",
  energy: "energy",
  practicalGuidance: ["a", "b", "c"],
  reflectionQuestion: "question",
  basisNote: "basis",
};

const velaSpeech = {
  version: "shared-speech-v2",
  status: "rendered",
  attempts: 1,
  fallbackFields: [],
  violations: [],
  safeFallback: false,
  overview: "今天先慢一點。",
  narrative: "事情不用一次全部處理，先把最吵的那一件放到眼前就好。",
};

test("history re-computes sky context and canonical evidence instead of trusting browser snapshots", () => {
  const request = normalizeAstrologyRequest({ signId: "virgo", period: "daily", localDate: "2026-09-07", timezone: "Asia/Taipei", requestId: "request-123" });
  const snapshot = normalizeAstrologyHistorySnapshot({
    kind: "astrology",
    sourceGrounded: true,
    readingId: astrologyReadingId(request),
    requestId: request.requestId,
    sign: { id: "virgo" },
    period: request.period,
    localDate: request.localDate,
    timezone: request.timezone,
    skyContext: { fake: true },
    sources: { references: [{ fake: true }] },
    result,
    velaSpeech,
  });
  assert.equal(snapshot.skyContext.period, "daily");
  assert.equal(snapshot.skyContext.fake, undefined);
  assert.equal(snapshot.sourceGrounded, true);
  assert.ok(snapshot.sources.references.length >= 2);
  assert.equal(snapshot.sources.references.some((reference) => reference.fake), false);
  assert.equal(snapshot.result._velaSpeech.overview, velaSpeech.overview);
});

test("history refuses pre-source prototype snapshots", () => {
  const request = normalizeAstrologyRequest({ signId: "virgo", period: "daily", localDate: "2026-09-07", timezone: "Asia/Taipei", requestId: "request-123" });
  assert.throws(() => normalizeAstrologyHistorySnapshot({
    kind: "astrology",
    readingId: astrologyReadingId(request),
    requestId: request.requestId,
    sign: { id: "virgo" },
    period: request.period,
    localDate: request.localDate,
    timezone: request.timezone,
    result,
  }));
});

test("history summary prefers stored Vela speech but remains compatible with old rows", () => {
  const baseRow = {
    id: "astro_1234567890abcdef1234567890abcdef",
    sign_id: "virgo",
    sign_name_zh_tw: "處女座",
    period: "weekly",
    local_date: "2026-09-07",
    updated_at: "2026-09-07T10:00:00Z",
    expires_at: "2027-09-07T10:00:00Z",
  };
  const summary = astrologyHistoryRowToSummary({
    ...baseRow,
    reading_result: { ...result, _velaSpeech: velaSpeech },
  });
  const legacy = astrologyHistoryRowToSummary({ ...baseRow, reading_result: result });
  assert.equal(summary.kind, "astrology");
  assert.equal(summary.periodLabel, "本週運勢");
  assert.equal(summary.overview, velaSpeech.overview);
  assert.equal(legacy.overview, result.overview);
});

test("history row restores stored speech separately from canonical analysis", () => {
  const request = normalizeAstrologyRequest({ signId: "virgo", period: "daily", localDate: "2026-09-07", timezone: "Asia/Taipei", requestId: "request-123" });
  const snapshot = normalizeAstrologyHistorySnapshot({
    kind: "astrology",
    sourceGrounded: true,
    readingId: astrologyReadingId(request),
    requestId: request.requestId,
    sign: { id: "virgo" },
    period: request.period,
    localDate: request.localDate,
    timezone: request.timezone,
    result,
    velaSpeech,
  });
  const restored = astrologyHistoryRowToSnapshot({
    id: snapshot.readingId,
    request_id: snapshot.requestId,
    sign_id: snapshot.sign.id,
    sign_name_zh_tw: snapshot.sign.nameZhTw,
    sign_profile: snapshot.sign,
    period: snapshot.period,
    local_date: snapshot.localDate,
    timezone: snapshot.timezone,
    sky_context: snapshot.skyContext,
    reading_result: snapshot.result,
    disclaimer: "",
  });
  assert.equal(restored.result.overview, result.overview);
  assert.equal(restored.result._velaSpeech, undefined);
  assert.equal(restored.velaSpeech.overview, velaSpeech.overview);
});
