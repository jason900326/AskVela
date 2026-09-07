import assert from "node:assert/strict";
import test from "node:test";
import {
  historyRowsToSnapshot,
  normalizeReadingHistorySnapshot,
  ReadingHistoryMismatchError,
} from "../lib/reading-history.js";
import { createTarotDraw } from "../lib/tarot-draw.js";

const SECRET = "phase-six-reading-history-test-secret-123456";

function sampleSnapshot() {
  const requestId = "history-request-12345678";
  const question = "我現在最該留意什麼？";
  const spreadId = "situation-obstacle-advice";
  const selectedCardIndexes = [2, 7, 10];
  const draw = createTarotDraw(
    { question, spreadId, idempotencyKey: requestId, selectedCardIndexes },
    { secret: SECRET },
  );
  const result = {
    readingId: draw.readingId,
    cards: draw.cards.map((card) => ({
      ...card,
      sourceMeaning: "來源牌義",
      contextInterpretation: "情境解讀",
      practicalFocus: "先觀察",
      sources: [],
    })),
    synthesis: { overview: "先慢一點看清楚", narrative: "這是一次測試解讀。" },
    disclaimer: "牌面提供反思方向。",
  };
  return {
    readingId: draw.readingId,
    requestId,
    question,
    spreadId,
    selectedCardIndexes,
    draw,
    result,
    followUps: [{ question: "那第一步呢？", answer: "先確認界線。", practicalFocus: "寫下條件" }],
  };
}

test("history normalization rebuilds and preserves the server-fixed draw", () => {
  const input = sampleSnapshot();
  const normalized = normalizeReadingHistorySnapshot(input, { drawSecret: SECRET });

  assert.equal(normalized.reading.id, input.readingId);
  assert.deepEqual(normalized.reading.selected_card_indexes, [2, 7, 10]);
  assert.equal(normalized.cards.length, 3);
  assert.deepEqual(
    normalized.cards.map((card) => `${card.card_id}:${card.position}:${card.orientation}`),
    input.draw.cards.map((card) => `${card.cardId}:${card.position}:${card.orientation}`),
  );
  assert.equal(normalized.messages[0].ordinal, 1);
});

test("history normalization rejects client-side card tampering", () => {
  const input = sampleSnapshot();
  input.draw.cards[0].orientation = input.draw.cards[0].orientation === "upright" ? "reversed" : "upright";

  assert.throws(
    () => normalizeReadingHistorySnapshot(input, { drawSecret: SECRET }),
    ReadingHistoryMismatchError,
  );
});

test("database rows restore the complete follow-up-capable browser snapshot", () => {
  const input = sampleSnapshot();
  const normalized = normalizeReadingHistorySnapshot(input, { drawSecret: SECRET });
  const readingRow = {
    ...normalized.reading,
    selected_card_indexes: normalized.reading.selected_card_indexes,
  };
  const cardRows = normalized.cards.map((card) => ({ ...card }));
  const messageRows = normalized.messages.map((message) => ({
    ...message,
    practical_focus: message.practicalFocus,
  }));
  const restored = historyRowsToSnapshot(readingRow, cardRows, messageRows);

  assert.equal(restored.readingId, input.readingId);
  assert.deepEqual(restored.selectedCardIndexes, input.selectedCardIndexes);
  assert.equal(restored.draw.cards.length, 3);
  assert.equal(restored.followUps[0].answer, "先確認界線。");
});
