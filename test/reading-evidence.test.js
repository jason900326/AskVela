import assert from "node:assert/strict";
import test from "node:test";
import {
  balanceEvidenceAcrossBooks,
  retrieveReadingEvidence,
  toHumanSourceReference,
} from "../lib/reading-evidence.js";

const DRAW = {
  readingId: "reading-1",
  question: "這份工作目前最大的阻礙是什麼？",
  spread: { id: "situation-obstacle-advice", nameZhTw: "現況・阻礙・建議" },
  cards: [
    {
      cardId: "major-16-tower",
      nameEn: "The Tower",
      nameZhTw: "高塔",
      position: "obstacle",
      positionLabelZhTw: "阻礙",
      orientation: "reversed",
    },
  ],
};

test("reading retrieval applies exact card and orientation filters before ranking", async () => {
  const calls = [];
  const retriever = async (query, options) => {
    calls.push({ query, options });
    return [{
      id: 7,
      book_id: "book-1",
      book_title: "The Pictorial Key to the Tarot",
      author: "Arthur Edward Waite",
      tarot_system: "Rider-Waite-Smith",
      card_id: "major-16-tower",
      card_name: "The Tower",
      card_name_zh_tw: "高塔",
      orientation: "reversed",
      section_type: "divinatory_meaning",
      source_location: { pdf_page_start: 101, pdf_page_end: 102 },
      chunk_index: 3,
      content: "Source text",
    }];
  };

  const result = await retrieveReadingEvidence(DRAW, { retriever });
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].options.cardIds, ["major-16-tower"]);
  assert.equal(calls[0].options.orientation, "reversed");
  assert.equal(calls[0].options.matchCount, 12);
  assert.match(calls[0].query, /阻礙/u);
  assert.match(calls[0].query, /逆位/u);
  assert.equal(result.cards[0].evidence[0].sourceId, "card-1-source-1");
  assert.equal(toHumanSourceReference(result.cards[0].evidence[0]).page, "PDF 第 101–102 頁");
  assert.equal(toHumanSourceReference(result.cards[0].evidence[0]).tarotSystem, "Rider-Waite-Smith");
});

test("evidence selection gives different books representation before taking extra chunks", () => {
  const chunks = [
    { id: 1, book_id: "waite", content: "Waite 1" },
    { id: 2, book_id: "waite", content: "Waite 2" },
    { id: 3, book_id: "waite", content: "Waite 3" },
    { id: 4, book_id: "mathers", content: "Mathers 1" },
    { id: 5, book_id: "mathers", content: "Mathers 2" },
  ];

  const selected = balanceEvidenceAcrossBooks(chunks, 4);
  assert.deepEqual(selected.map((chunk) => chunk.id), [1, 4, 2, 5]);
});

