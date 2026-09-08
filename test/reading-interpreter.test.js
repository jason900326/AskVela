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

function validOutputs(draw) {
  return [
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
      overview: "分析層摘要",
      narrative: "分析層把牌面整理成一段連續的轉變。",
      crossCardPattern: "過去到未來的推進",
      practicalGuidance: ["先整理現況"],
      reflectionQuestions: ["什麼最值得保留？"],
    },
    {
      overview: "我會先看你現在最卡的那一小塊。",
      narrative: "有些東西其實已經在動了，只是你可能還沒很想承認。先別急著把整件事一次想完。看一個地方就好——最近哪個選擇，會讓你一想到就停一下？",
    },
  ];
}

test("interpretation executes A then B then C then grounded Vela speech", async () => {
  const draw = createTarotDraw(
    { question: REQUEST.question, spreadId: REQUEST.spreadId, idempotencyKey: REQUEST.requestId },
    { secret: SECRET },
  );
  const calls = [];
  const outputs = validOutputs(draw);
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

  assert.equal(calls.length, 4);
  assert.equal(calls[0].text.format.name, "askvela_source_meaning");
  assert.equal(calls[1].text.format.name, "askvela_context_interpretation");
  assert.equal(calls[2].text.format.name, "askvela_synthesis");
  assert.equal(calls[3].text.format.name, "askvela_speech");
  assert.match(calls[1].input, /原典牌義 1/u);
  assert.match(calls[2].input, /情境解讀 1/u);
  assert.match(calls[3].input, /分析層把牌面整理/u);
  assert.match(calls[3].input, /情境解讀 1/u);
  assert.equal(result.cards.length, 3);
  assert.deepEqual(result.cards[0].citationIds, ["card-1-source-1"]);
  assert.equal(result.cards[0].sources[0].book, "The Pictorial Key to the Tarot");
  assert.equal(new Set(result.cards[0].sources.map((source) => source.book)).size, 2);
  assert.equal(result.analysisSynthesis.overview, "分析層摘要");
  assert.equal(result.analysisSynthesis.crossCardPattern, "過去到未來的推進");
  assert.equal(result.synthesis.overview, outputs[3].overview);
  assert.equal(result.synthesis.narrative, outputs[3].narrative);
  assert.equal(result.synthesis.crossCardPattern, "過去到未來的推進");
  assert.equal(result.velaSpeech.status, "rendered");
  assert.equal(result.velaSpeech.version, "tarot-speech-v1");
  assert.match(result.disclaimer, /不保證未來/u);
});

test("speech renderer failure falls back to grounded Layer C without failing the reading", async () => {
  const draw = createTarotDraw(
    { question: REQUEST.question, spreadId: REQUEST.spreadId, idempotencyKey: REQUEST.requestId },
    { secret: SECRET },
  );
  const outputs = validOutputs(draw).slice(0, 3);
  let callIndex = 0;
  const openai = {
    responses: {
      create: async () => {
        const index = callIndex;
        callIndex += 1;
        if (index === 3) return { output_text: "not-json" };
        return { output_text: JSON.stringify(outputs[index]) };
      },
    },
  };
  const retriever = async (_query, options) => sourceFor(options.cardIds[0]);
  const originalWarn = console.warn;
  console.warn = () => {};
  try {
    const result = await interpretTarotReading(
      REQUEST,
      { drawSecret: SECRET, openai, evidenceOptions: { retriever } },
    );
    assert.equal(callIndex, 4);
    assert.equal(result.velaSpeech.status, "fallback");
    assert.equal(result.synthesis.overview, "分析層摘要");
    assert.equal(result.synthesis.narrative, "分析層把牌面整理成一段連續的轉變。");
    assert.deepEqual(result.analysisSynthesis, {
      overview: "分析層摘要",
      narrative: "分析層把牌面整理成一段連續的轉變。",
      crossCardPattern: "過去到未來的推進",
      practicalGuidance: ["先整理現況"],
      reflectionQuestions: ["什麼最值得保留？"],
    });
  } finally {
    console.warn = originalWarn;
  }
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
