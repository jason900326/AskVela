import assert from "node:assert/strict";
import test from "node:test";
import { astrologyHistoryRowToSummary, normalizeAstrologyHistorySnapshot } from "../lib/astrology-history.js";
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
  });
  assert.equal(snapshot.skyContext.period, "daily");
  assert.equal(snapshot.skyContext.fake, undefined);
  assert.equal(snapshot.sourceGrounded, true);
  assert.ok(snapshot.sources.references.length >= 2);
  assert.equal(snapshot.sources.references.some((reference) => reference.fake), false);
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

test("history summary is typed for the unified Vela history UI", () => {
  const summary = astrologyHistoryRowToSummary({ id: "astro_1234567890abcdef1234567890abcdef", sign_id: "virgo", sign_name_zh_tw: "處女座", period: "weekly", local_date: "2026-09-07", reading_result: { overview: "test" }, updated_at: "2026-09-07T10:00:00Z", expires_at: "2027-09-07T10:00:00Z" });
  assert.equal(summary.kind, "astrology");
  assert.equal(summary.periodLabel, "本週運勢");
});
