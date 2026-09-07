import assert from "node:assert/strict";
import test from "node:test";
import { createTarotDraw, DrawValidationError } from "../lib/tarot-draw.js";

const SECRET = "immersive-selection-test-secret-at-least-32-characters";
const BASE = {
  question: "我最近最需要留意什麼？",
  spreadId: "situation-obstacle-advice",
  idempotencyKey: "immersive-selection-request-001",
};

test("user-selected card-back positions genuinely determine the fixed draw", () => {
  const first = createTarotDraw(
    { ...BASE, selectedIndices: [0, 4, 9] },
    { secret: SECRET },
  );
  const retry = createTarotDraw(
    { ...BASE, selectedIndices: [0, 4, 9] },
    { secret: SECRET },
  );
  const differentChoice = createTarotDraw(
    { ...BASE, selectedIndices: [1, 5, 10] },
    { secret: SECRET },
  );

  assert.deepEqual(first, retry);
  assert.deepEqual(first.selectedIndices, [0, 4, 9]);
  assert.notEqual(first.readingId, differentChoice.readingId);
  assert.notDeepEqual(
    first.cards.map((card) => card.cardId),
    differentChoice.cards.map((card) => card.cardId),
  );
});

test("selection count, uniqueness, and bounds are validated", () => {
  assert.throws(
    () => createTarotDraw({ ...BASE, selectedIndices: [0, 1] }, { secret: SECRET }),
    DrawValidationError,
  );
  assert.throws(
    () => createTarotDraw({ ...BASE, selectedIndices: [2, 2, 3] }, { secret: SECRET }),
    DrawValidationError,
  );
  assert.throws(
    () => createTarotDraw({ ...BASE, selectedIndices: [0, 1, 78] }, { secret: SECRET }),
    DrawValidationError,
  );
});
