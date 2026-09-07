import assert from "node:assert/strict";
import test from "node:test";
import { identifyRequestedTarotSources } from "../lib/tarot-source-target.js";

test("detects Waite-only questions", () => {
  const result = identifyRequestedTarotSources("Waite 如何描述 The Fool？");
  assert.equal(result.explicitlyTargeted, true);
  assert.deepEqual(result.sourceIds, ["waite"]);
  assert.deepEqual(result.bookSlugs, ["the-pictorial-key-to-the-tarot"]);
});

test("detects Mathers-only questions", () => {
  const result = identifyRequestedTarotSources("Mathers 如何解讀 Queen of Swords 逆位？");
  assert.equal(result.explicitlyTargeted, true);
  assert.deepEqual(result.sourceIds, ["mathers"]);
  assert.deepEqual(result.bookSlugs, ["the-tarot-macgregor-mathers-1888"]);
});

test("detects author comparison questions without collapsing either source", () => {
  const result = identifyRequestedTarotSources("Waite 和 Mathers 對 The Moon 有什麼不同？");
  assert.equal(result.explicitlyTargeted, true);
  assert.deepEqual(result.sourceIds, ["waite", "mathers"]);
  assert.equal(result.bookSlugs.length, 2);
});

test("leaves ordinary tarot questions unrestricted by author", () => {
  const result = identifyRequestedTarotSources("The High Priestess 正位代表什麼？");
  assert.equal(result.explicitlyTargeted, false);
  assert.deepEqual(result.bookSlugs, []);
});
