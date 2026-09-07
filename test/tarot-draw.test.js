import assert from "node:assert/strict";
import test from "node:test";
import { createTarotDraw, DrawValidationError } from "../lib/tarot-draw.js";
import { TAROT_SPREADS } from "../lib/tarot-spreads.js";

const SECRET = "test-only-secret-with-at-least-32-characters";

function draw(overrides = {}) {
  return createTarotDraw(
    {
      question: "我最近適合把注意力放在哪裡？",
      spreadId: "situation-obstacle-advice",
      idempotencyKey: "018f4f5c-8d29-7ad7-8000-0123456789ab",
      ...overrides,
    },
    { secret: SECRET },
  );
}

test("V1 registry exposes one single-card and two three-card spreads", () => {
  assert.equal(TAROT_SPREADS.length, 3);
  assert.deepEqual(
    TAROT_SPREADS.map((spread) => [spread.id, spread.positions.length]),
    [
      ["single-guidance", 1],
      ["past-present-future", 3],
      ["situation-obstacle-advice", 3],
    ],
  );
});

test("draw uses the spread positions and never repeats a card", () => {
  const result = draw();
  assert.equal(result.cards.length, 3);
  assert.deepEqual(result.cards.map((card) => card.position), ["situation", "obstacle", "advice"]);
  assert.equal(new Set(result.cards.map((card) => card.cardId)).size, 3);
  assert.match(result.readingId, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u);
  assert.ok(result.cards.every((card) => ["upright", "reversed"].includes(card.orientation)));
});

test("the same idempotency key and payload reproduce the exact same reading", () => {
  assert.deepEqual(draw(), draw());
  assert.notDeepEqual(draw(), draw({ idempotencyKey: "a-different-idempotency-key" }));
});

test("all 78 cards and both orientations are reachable across independent draws", () => {
  const cards = new Set();
  const orientations = new Set();
  for (let index = 0; index < 500; index += 1) {
    const result = draw({
      spreadId: "single-guidance",
      idempotencyKey: `sample-idempotency-key-${index}`,
    });
    cards.add(result.cards[0].cardId);
    orientations.add(result.cards[0].orientation);
  }
  assert.equal(cards.size, 78);
  assert.deepEqual([...orientations].sort(), ["reversed", "upright"]);
});

test("invalid questions, spreads, and idempotency keys are rejected", () => {
  assert.throws(() => draw({ question: "   " }), DrawValidationError);
  assert.throws(() => draw({ question: "a".repeat(501) }), DrawValidationError);
  assert.throws(() => draw({ spreadId: "celtic-cross" }), DrawValidationError);
  assert.throws(() => draw({ idempotencyKey: "short" }), DrawValidationError);
});

