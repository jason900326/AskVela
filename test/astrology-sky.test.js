import assert from "node:assert/strict";
import test from "node:test";
import {
  approximateSunLongitude,
  buildDailySkyContext,
  buildWeeklySkyContext,
} from "../lib/astrology-sky.js";

function angularDistance(a, b) {
  const delta = Math.abs(a - b) % 360;
  return delta > 180 ? 360 - delta : delta;
}

test("approximate solar longitude remains near the tropical seasonal anchors", () => {
  assert.ok(angularDistance(approximateSunLongitude("2026-03-20"), 0) < 3);
  assert.ok(angularDistance(approximateSunLongitude("2026-06-21"), 90) < 3);
  assert.ok(angularDistance(approximateSunLongitude("2026-09-23"), 180) < 3);
  assert.ok(angularDistance(approximateSunLongitude("2026-12-21"), 270) < 3);
});

test("daily sky context is deterministic and limited to sun/moon signals", () => {
  const first = buildDailySkyContext({ signId: "virgo", localDate: "2026-09-07" });
  const second = buildDailySkyContext({ signId: "virgo", localDate: "2026-09-07" });
  assert.deepEqual(first, second);
  assert.equal(first.snapshots.length, 1);
  assert.equal(first.method.scope, "sun-sign + approximate solar/lunar transits");
  assert.ok(first.signals.some((signal) => signal.includes("太陽")));
  assert.ok(first.signals.some((signal) => signal.includes("月亮")));
});

test("weekly sky context spans Monday through Sunday", () => {
  const context = buildWeeklySkyContext({ signId: "virgo", localDate: "2026-09-07" });
  assert.equal(context.dateRange.start, "2026-09-07");
  assert.equal(context.dateRange.end, "2026-09-13");
  assert.equal(context.snapshots.length, 7);
});
