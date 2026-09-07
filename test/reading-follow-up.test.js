import assert from "node:assert/strict";
import test from "node:test";
import {
  buildFollowUpInput,
  FOLLOW_UP_LIMITS,
  FollowUpMismatchError,
  FollowUpValidationError,
  rebuildFixedFollowUpDraw,
  validateFollowUpPayload,
} from "../lib/reading-follow-up.js";
import { createTarotDraw } from "../lib/tarot-draw.js";

const SECRET = "test-only-secret-with-at-least-32-characters";
const BASE = {
  question: "我最近適合把注意力放在哪裡？",
  spreadId: "situation-obstacle-advice",
  requestId: "018f4f5c-8d29-7ad7-8000-0123456789ab",
};

function initialDraw() {
  return createTarotDraw(
    {
      question: BASE.question,
      spreadId: BASE.spreadId,
      idempotencyKey: BASE.requestId,
    },
    { secret: SECRET },
  );
}

function payload(overrides = {}) {
  const draw = initialDraw();
  return {
    ...BASE,
    readingId: draw.readingId,
    message: "那我現在最需要先確認的是什麼？",
    history: [],
    initialReading: {
      overview: "先把方向釐清，再決定下一步。",
      narrative: "原本的解讀摘要。",
      cards: draw.cards.map((card) => ({
        cardId: card.cardId,
        contextInterpretation: "原本的單牌情境解讀。",
        practicalFocus: "先確認眼前資訊。",
      })),
    },
    ...overrides,
  };
}

test("follow-up payload enforces message length and per-reading count limits", () => {
  const valid = validateFollowUpPayload(payload());
  assert.equal(valid.message, "那我現在最需要先確認的是什麼？");

  assert.throws(
    () => validateFollowUpPayload(payload({ message: "問".repeat(FOLLOW_UP_LIMITS.messageCharacters + 1) })),
    FollowUpValidationError,
  );

  const history = Array.from({ length: FOLLOW_UP_LIMITS.maxFollowUps }, (_, index) => ({
    question: `第 ${index + 1} 次追問`,
    answer: `第 ${index + 1} 次回答`,
  }));
  assert.throws(
    () => validateFollowUpPayload(payload({ history })),
    (error) => error instanceof FollowUpValidationError && error.code === "FOLLOW_UP_LIMIT_REACHED",
  );
});

test("follow-up rebuilds the exact original draw and rejects a mismatched readingId", () => {
  const original = initialDraw();
  const input = validateFollowUpPayload(payload());
  const rebuilt = rebuildFixedFollowUpDraw(input, { drawSecret: SECRET });

  assert.equal(rebuilt.readingId, original.readingId);
  assert.deepEqual(
    rebuilt.cards.map(({ cardId, position, orientation }) => ({ cardId, position, orientation })),
    original.cards.map(({ cardId, position, orientation }) => ({ cardId, position, orientation })),
  );

  assert.throws(
    () => rebuildFixedFollowUpDraw({ ...input, readingId: "00000000-0000-4000-8000-000000000000" }, { drawSecret: SECRET }),
    FollowUpMismatchError,
  );
});

test("follow-up model context keeps fixed cards, sources, initial reading, and only recent history", () => {
  const draw = initialDraw();
  const input = validateFollowUpPayload(payload({
    history: Array.from({ length: 5 }, (_, index) => ({
      question: `歷史問題 ${index + 1}`,
      answer: `歷史回答 ${index + 1}`,
    })),
  }));
  const reading = {
    ...draw,
    cards: draw.cards.map((card, index) => ({
      ...card,
      evidence: [
        {
          sourceId: `waite-${index}`,
          bookTitle: "The Pictorial Key to the Tarot",
          author: "Arthur Edward Waite",
          sectionType: "divinatory_meaning",
          orientation: card.orientation,
          content: "Waite evidence",
        },
        {
          sourceId: `mathers-${index}`,
          bookTitle: "The Tarot",
          author: "S. L. MacGregor Mathers",
          sectionType: "meaning",
          orientation: card.orientation,
          content: "Mathers evidence",
        },
      ],
    })),
  };

  const context = JSON.parse(buildFollowUpInput(reading, input));
  assert.equal(context.fixedCards.length, draw.cards.length);
  assert.equal(context.fixedCards[0].cardId, draw.cards[0].cardId);
  assert.equal(context.fixedCards[0].orientation, draw.cards[0].orientation);
  assert.equal(context.fixedCards[0].sourceEvidence.length, 2);
  assert.equal(context.initialReading.overview, "先把方向釐清，再決定下一步。");
  assert.equal(context.recentFollowUps.length, FOLLOW_UP_LIMITS.maxHistoryExchangesForModel);
  assert.equal(context.recentFollowUps[0].question, "歷史問題 2");
  assert.equal(context.currentFollowUp, "那我現在最需要先確認的是什麼？");
});
