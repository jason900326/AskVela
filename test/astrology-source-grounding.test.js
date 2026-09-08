import assert from "node:assert/strict";
import test from "node:test";
import { buildAstrologyEvidence } from "../lib/astrology-evidence.js";
import { buildAstrologySkyContext } from "../lib/astrology-sky.js";

function evidenceFor(signId, period = "daily", localDate = "2026-09-08") {
  const skyContext = buildAstrologySkyContext({ signId, period, localDate });
  return { skyContext, evidence: buildAstrologyEvidence({ signId, skyContext }) };
}

test("all twelve signs have sufficient attributable evidence", () => {
  const ids = [
    "aries", "taurus", "gemini", "cancer", "leo", "virgo",
    "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces",
  ];

  for (const signId of ids) {
    const { evidence } = evidenceFor(signId);
    assert.equal(evidence.sufficient, true, signId);
    assert.ok(evidence.items.some((item) => item.id === `sign-${signId}`));
    const sourceIds = new Set(evidence.references.map((item) => item.sourceId));
    assert.ok(sourceIds.has("alan-leo-1910"), `${signId} missing Alan Leo`);
    assert.ok(sourceIds.has("sepharial-1920"), `${signId} missing Sepharial`);
  }
});

test("current sky aspect is only the computed Sun-Moon relationship", () => {
  const { skyContext } = evidenceFor("virgo", "weekly");
  for (const snapshot of skyContext.snapshots) {
    assert.equal("aspectsToSunSign" in snapshot, false);
    if (snapshot.sunMoonAspect) {
      assert.ok(["conjunction", "sextile", "square", "trine", "opposition"].includes(snapshot.sunMoonAspect.id));
      assert.ok(snapshot.sunMoonAspect.orb <= 8);
    }
  }
  assert.match(skyContext.method.precisionNote, /does not claim exact natal aspects/u);
});

test("source evidence preserves natal/transit application boundaries", () => {
  const { evidence } = evidenceFor("aries");
  const sign = evidence.items.find((item) => item.id === "sign-aries");
  const transit = evidence.items.find((item) => item.id === "transit-method");
  const boundary = evidence.items.find((item) => item.id === "natal-boundary");

  assert.equal(sign.scope, "natal_sun_sign");
  assert.equal(transit.scope, "transit_method");
  assert.equal(boundary.scope, "application_boundary");
  assert.match(boundary.principle, /不能直接套/u);
  assert.ok(evidence.guardrails.some((item) => /本命月亮/u.test(item)));
});
