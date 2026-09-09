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
      overview: "先把現在最卡的地方拆小一點。",
      narrative: "有些事情已經開始移動，你現在可以先把選擇拆小。先看最近哪個選擇最容易讓你停住，再回到牌面支持的具體線索。這樣比較容易分開疲累和真正想調整的方向。",
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
  assert.equal(calls[3].text.format.name, "askvela_tarot_speech");
  assert.equal(calls[3].max_output_tokens, 520);
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
  assert.equal(result.synthesis.overview, "分析層摘要");
  assert.equal(result.synthesis.narrative, "分析層把牌面整理成一段連續的轉變。");
  assert.equal(result.synthesis.crossCardPattern, "過去到未來的推進");
  assert.equal(result.velaSpeech.status, "rendered");
  assert.equal(result.velaSpeech.attempts, 1);
  assert.equal(result.velaSpeech.version, "shared-speech-v3");
  assert.equal(result.velaSpeech.overview, outputs[3].overview);
  assert.equal(result.velaSpeech.narrative, outputs[3].narrative);
  assert.deepEqual(result.velaSpeech.fallbackFields, []);
  assert.match(result.disclaimer, /不保證未來/u);
});

test("speech renderer retries only Layer D and succeeds without rerunning grounded analysis", async () => {
  const draw = createTarotDraw(
    { question: REQUEST.question, spreadId: REQUEST.spreadId, idempotencyKey: REQUEST.requestId },
    { secret: SECRET },
  );
  const outputs = validOutputs(draw);
  const calls = [];
  const openai = {
    responses: {
      create: async (request) => {
        calls.push(request);
        if (calls.length === 4) return { output_text: "not-json" };
        if (calls.length === 5) return { output_text: JSON.stringify(outputs[3]) };
        return { output_text: JSON.stringify(outputs[calls.length - 1]) };
      },
    },
  };
  const retriever = async (_query, options) => sourceFor(options.cardIds[0]);

  const result = await interpretTarotReading(
    REQUEST,
    { drawSecret: SECRET, openai, evidenceOptions: { retriever } },
  );

  assert.equal(calls.length, 5);
  assert.deepEqual(calls.map((call) => call.text.format.name), [
    "askvela_source_meaning",
    "askvela_context_interpretation",
    "askvela_synthesis",
    "askvela_tarot_speech",
    "askvela_tarot_speech",
  ]);
  assert.match(calls[4].instructions, /Speech Layer 的修正重試/u);
  assert.equal(result.velaSpeech.status, "rendered");
  assert.equal(result.velaSpeech.attempts, 2);
  assert.equal(result.velaSpeech.overview, outputs[3].overview);
  assert.equal(result.synthesis.overview, "分析層摘要");
});

test("speech renderer failure retries Layer D twice then falls back to grounded Layer C for normal questions", async () => {
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
        if (index >= 3) return { output_text: "not-json" };
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
    assert.equal(callIndex, 5);
    assert.equal(result.velaSpeech.status, "fallback");
    assert.equal(result.velaSpeech.attempts, 2);
    assert.deepEqual(result.velaSpeech.fallbackFields, ["overview", "narrative"]);
    assert.equal(result.synthesis.overview, "分析層摘要");
    assert.equal(result.synthesis.narrative, "分析層把牌面整理成一段連續的轉變。");
  } finally {
    console.warn = originalWarn;
  }
});

test("high-stakes speech failure uses deterministic safe copy instead of exposing Layer C", async () => {
  const request = {
    question: "我手上這檔股票一直跌，我是不是應該現在全部賣掉？",
    spreadId: "single-guidance",
    requestId: "high-stakes-financial-speech-test",
  };
  const draw = createTarotDraw(
    { question: request.question, spreadId: request.spreadId, idempotencyKey: request.requestId },
    { secret: SECRET },
  );
  const outputs = validOutputs(draw).slice(0, 3);
  outputs[2] = {
    overview: "先不要只因為跌很快就全賣。",
    narrative: "如果你原本沒有停損點，現在最急的也許不是賣或不賣，而是補上決策規則。",
    crossCardPattern: "",
    practicalGuidance: ["先檢查停損"],
    reflectionQuestions: [],
  };
  let callIndex = 0;
  const openai = {
    responses: {
      create: async () => {
        const index = callIndex;
        callIndex += 1;
        if (index >= 3) return { output_text: "not-json" };
        return { output_text: JSON.stringify(outputs[index]) };
      },
    },
  };
  const retriever = async (_query, options) => sourceFor(options.cardIds[0]);
  const originalWarn = console.warn;
  console.warn = () => {};
  try {
    const result = await interpretTarotReading(
      request,
      { drawSecret: SECRET, openai, evidenceOptions: { retriever } },
    );
    assert.equal(callIndex, 5);
    assert.equal(result.safety.isHighStakes, true);
    assert.ok(result.safety.categories.includes("financial"));
    assert.equal(result.velaSpeech.status, "safe-fallback");
    assert.equal(result.velaSpeech.safeFallback, true);
    assert.equal(result.velaSpeech.attempts, 2);
    assert.match(result.synthesis.overview, /不會用象徵解讀替你決定買賣/u);
    assert.match(result.synthesis.narrative, /可靠資料/u);
    assert.doesNotMatch(result.synthesis.narrative, /停損點/u);
    assert.equal(result.analysisSynthesis.overview, "先不要只因為跌很快就全賣。");
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
