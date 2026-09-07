import assert from "node:assert/strict";
import test from "node:test";
import {
  interpretTarotReading,
  ReadingMismatchError,
  ReadingOutputError,
} from "../lib/reading-interpreter.js";
import { createTarotDraw } from "../lib/tarot-draw.js";

const SECRET = "test-only-secret-with-at-least-32-characters";
const REQUEST = {
  question: "我最近適合把注意力放在哪裡？",
  spreadId: "past-present-future",
  requestId: "phase-3-test-request-id",
};

function sourceFor(cardId) {
  return [
    {
      id: `waite-${cardId}`,
      book_id: "book-waite",
      book_title: "The Pictorial Key to the Tarot",
      author: "Arthur Edward Waite",
      tarot_system: "Rider-Waite-Smith",
      chapter: "The Cards and Their Symbolism",
      card_id: cardId,
      card_name: cardId,
      card_name_zh_tw: cardId,
      orientation: null,
      section_type: "description_symbolism",
      source_location: { pdf_page_start: 42 },
      chunk_index: 1,
      content: `Waite grounded source for ${cardId}`,
    },
    {
      id: `mathers-${cardId}`,
      book_id: "book-mathers",
      book_title: "The Tarot",
      author: "S. L. MacGregor Mathers",
      tarot_system: "Pre-RWS Continental",
      chapter: "Meanings of the Cards",
      card_id: cardId,
      card_name: cardId,
      card_name_zh_tw: cardId,
      orientation: null,
      section_type: "divinatory_meaning",
      source_location: { pdf_page_start: 15 },
      chunk_index: 2,
      content: `Mathers grounded source for ${cardId}`,
    },
  ];
}

test("interpretation executes A then B then C and returns traceable structured cards", async () => {
  const draw = createTarotDraw(
    { question: REQUEST.question, spreadId: REQUEST.spreadId, idempotencyKey: REQUEST.requestId },
    { secret: SECRET },
  );
  const calls = [];
  const outputs = [
    {
      cards: draw.cards.map((card, index) => ({
        cardId: card.cardId,
        sourceMeaning: `原典牌義 ${index + 1}`,
        citationIds: [`card-${index + 1}-source-1`, "invented-source"],
        limitations: [],
      })),
    },
    {
      cards: draw.cards.map((card, index) => ({
        cardId: card.cardId,
        positionRole: card.positionLabelZhTw,
        contextInterpretation: `情境解讀 ${index + 1}`,
        practicalFocus: `行動焦點 ${index + 1}`,
      })),
    },
    {
      overview: "整體摘要",
      narrative: "牌面形成一段連續的轉變。",
      crossCardPattern: "過去到未來的推進",
      practicalGuidance: ["先整理現況"],
      reflectionQuestions: ["什麼最值得保留？"],
    },
  ];
  const openai = {
    responses: {
      create: async (request) => {
        calls.push(request);
        return { output_text: JSON.stringify(outputs[calls.length - 1]) };
      },
    },
  };
  const retriever = async (_query, options) => sourceFor(options.cardIds[0]);

  const result = await interpretTarotReading(
    { ...REQUEST, readingId: draw.readingId },
    { drawSecret: SECRET, openai, evidenceOptions: { retriever } },
  );

  assert.equal(calls.length, 3);
  assert.equal(calls[0].text.format.name, "askvela_source_meaning");
  assert.match(calls[1].input, /原典牌義 1/u);
  assert.match(calls[2].input, /情境解讀 1/u);
  assert.equal(result.cards.length, 3);
  assert.deepEqual(result.cards[0].citationIds, ["card-1-source-1"]);
  assert.equal(result.cards[0].sources[0].book, "The Pictorial Key to the Tarot");
  assert.equal(new Set(result.cards[0].sources.map((source) => source.book)).size, 2);
  assert.equal(result.synthesis.crossCardPattern, "過去到未來的推進");
  assert.match(result.disclaimer, /不保證未來/u);
});

test("an altered reading ID is rejected before retrieval or model calls", async () => {
  let called = false;
  const openai = { responses: { create: async () => { called = true; } } };
  const retriever = async () => { called = true; return []; };

  await assert.rejects(
    interpretTarotReading(
      { ...REQUEST, readingId: "altered-reading-id" },
      { drawSecret: SECRET, openai, evidenceOptions: { retriever } },
    ),
    ReadingMismatchError,
  );
  assert.equal(called, false);
});

test("Layer A cannot pass an invented citation as source-grounded evidence", async () => {
  const draw = createTarotDraw(
    { question: REQUEST.question, spreadId: REQUEST.spreadId, idempotencyKey: REQUEST.requestId },
    { secret: SECRET },
  );
  const openai = {
    responses: {
      create: async () => ({
        output_text: JSON.stringify({
          cards: draw.cards.map((card) => ({
            cardId: card.cardId,
            sourceMeaning: "看似有根據、實際沒有來源的敘述",
            citationIds: ["invented-source"],
            limitations: [],
          })),
        }),
      }),
    },
  };
  const retriever = async (_query, options) => sourceFor(options.cardIds[0]);

  await assert.rejects(
    interpretTarotReading(
      REQUEST,
      { drawSecret: SECRET, openai, evidenceOptions: { retriever } },
    ),
    ReadingOutputError,
  );
});
