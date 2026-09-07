import assert from "node:assert/strict";
import test from "node:test";
import { getZodiacByBirthday, getZodiacByLongitude, ZODIAC_SIGNS } from "../lib/zodiac.js";

test("zodiac registry has all 12 tropical sun signs", () => {
  assert.equal(ZODIAC_SIGNS.length, 12);
  assert.deepEqual(new Set(ZODIAC_SIGNS.map((sign) => sign.id)).size, 12);
});

test("birthday boundaries resolve deterministically without storing a birth time", () => {
  assert.equal(getZodiacByBirthday("2000-03-20")?.id, "pisces");
  assert.equal(getZodiacByBirthday("2000-03-21")?.id, "aries");
  assert.equal(getZodiacByBirthday("2000-12-21")?.id, "sagittarius");
  assert.equal(getZodiacByBirthday("2000-12-22")?.id, "capricorn");
  assert.equal(getZodiacByBirthday("2024-02-29")?.id, "pisces");
  assert.equal(getZodiacByBirthday("2023-02-29"), null);
});

test("ecliptic longitude maps to the expected tropical sign", () => {
  assert.equal(getZodiacByLongitude(0)?.id, "aries");
  assert.equal(getZodiacByLongitude(89.99)?.id, "gemini");
  assert.equal(getZodiacByLongitude(180)?.id, "libra");
  assert.equal(getZodiacByLongitude(359.99)?.id, "pisces");
});
