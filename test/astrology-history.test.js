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

test("history re-computes sky context instead of trusting the browser snapshot", () => {
  const request = normalizeAstrologyRequest({ signId: "virgo", period: "daily", localDate: "2026-09-07", timezone: "Asia/Taipei", requestId: "request-123" });
  const snapshot = normalizeAstrologyHistorySnapshot({ kind: "astrology", readingId: astrologyReadingId(request), requestId: request.requestId, sign: { id: "virgo" }, period: request.period, localDate: request.localDate, timezone: request.timezone, skyContext: { fake: true }, result });
  assert.equal(snapshot.skyContext.period, "daily");
  assert.equal(snapshot.skyContext.fake, undefined);
});

test("history summary is typed for the unified Vela history UI", () => {
  const summary = astrologyHistoryRowToSummary({ id: "astro_1234567890abcdef1234567890abcdef", sign_id: "virgo", sign_name_zh_tw: "處女座", period: "weekly", local_date: "2026-09-07", reading_result: { overview: "test" }, updated_at: "2026-09-07T10:00:00Z", expires_at: "2027-09-07T10:00:00Z" });
  assert.equal(summary.kind, "astrology");
  assert.equal(summary.periodLabel, "本週運勢");
});
