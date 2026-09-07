import assert from "node:assert/strict";
import test from "node:test";
import {
  identifyTarotQuery,
  TAROT_CARDS,
  validateTarotRegistry,
} from "../lib/tarot-cards.js";

test("canonical registry contains a valid 78-card deck", () => {
  assert.deepEqual(validateTarotRegistry(), []);
  assert.equal(TAROT_CARDS.filter((card) => card.arcana === "major").length, 22);
  assert.equal(TAROT_CARDS.filter((card) => card.arcana === "minor").length, 56);
});

test("identifies Traditional Chinese and English card queries", () => {
  const tower = identifyTarotQuery("The Tower 逆位在 Waite 原書怎麼解釋？");
  assert.deepEqual(tower.cardIds, ["major-16-tower"]);
  assert.equal(tower.orientation, "reversed");
  assert.deepEqual(
    identifyTarotQuery("我抽到女祭司正位").cardIds,
    ["major-02-high-priestess"],
  );
  assert.deepEqual(
    identifyTarotQuery("權杖三和聖杯二有什麼關係？").cardIds,
    ["minor-wands-three", "minor-cups-two"],
  );
  assert.equal(
    identifyTarotQuery("高塔的正位與逆位有什麼不同？").orientation,
    null,
  );
});

test("does not confuse ordinary English words with partial card names", () => {
  assert.deepEqual(identifyTarotQuery("The worldwide tradition").cardIds, []);
  assert.deepEqual(identifyTarotQuery("A starboard symbol").cardIds, []);
});
