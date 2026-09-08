import assert from "node:assert/strict";
import test from "node:test";
import { extractDreamFeatures, normalizeDreamText } from "../lib/dream-extractor.js";

test("dream extractor detects emotion, recurring themes and retrieval symbols", () => {
  const result = extractDreamFeatures("我又夢到在學校考試，怎麼樣都來不及，後來一直往下掉，我超焦慮。");
  assert.ok(result.emotions.includes("anxiety"));
  assert.ok(result.themes.includes("recurring"));
  assert.ok(result.themes.includes("school"));
  assert.ok(result.themes.includes("falling"));
  assert.ok(result.tags.includes("general"));
});

test("normalization collapses whitespace and respects max length", () => {
  assert.equal(normalizeDreamText("  我   夢到\n一台火車  "), "我 夢到 一台火車");
  assert.equal(normalizeDreamText("abcdef", 3), "abc");
});
