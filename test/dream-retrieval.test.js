import test from "node:test";
import assert from "node:assert/strict";
import {
  FREUD_DREAM_BOOK_SLUG,
  buildDreamRetrievalQuery,
  publicFreudDreamPassages,
  retrieveFreudDreamPassages,
} from "../lib/dream-retrieval.js";

test("Dream retrieval query keeps the remembered image and Freud method anchors", () => {
  const query = buildDreamRetrievalQuery({
    dreamText: "我夢到蛇",
    wakingLifeContext: "",
    extraction: { summary: "夢裡出現蛇", notableImages: ["蛇"], actions: [], emotions: [] },
  });
  assert.match(query, /我夢到蛇/u);
  assert.match(query, /蛇/u);
  assert.match(query, /Freud dream interpretation/u);
  assert.match(query, /condensation/u);
  assert.match(query, /displacement/u);
});

test("Dream retrieval scopes vector search to the Freud book and disables Tarot card filtering", async () => {
  let capturedQuestion = "";
  let capturedOptions = null;
  const chunks = await retrieveFreudDreamPassages(
    {
      dreamText: "我夢到月亮",
      extraction: { summary: "夢裡有月亮", notableImages: ["月亮"] },
    },
    {
      retrieve: async (question, options) => {
        capturedQuestion = question;
        capturedOptions = options;
        return [{ chunk_index: 7, content: "Freud source passage" }];
      },
    },
  );

  assert.match(capturedQuestion, /月亮/u);
  assert.deepEqual(capturedOptions.bookSlugs, [FREUD_DREAM_BOOK_SLUG]);
  assert.deepEqual(capturedOptions.cardIds, []);
  assert.equal(capturedOptions.tarotSystem, null);
  assert.equal(chunks.length, 1);
});

test("public Dream retrieval provenance exposes a bounded excerpt and Gutenberg source", () => {
  const [source] = publicFreudDreamPassages([{
    book_id: "book-1",
    book_title: "The Interpretation of Dreams",
    author: "Sigmund Freud",
    chunk_index: 12,
    chapter: "VI. THE DREAM-WORK",
    content: "x".repeat(1200),
    similarity: 0.71,
    source_location: { chapter: "VI. THE DREAM-WORK" },
  }]);

  assert.equal(source.id, "freud-rag-12");
  assert.equal(source.chapter, "VI. THE DREAM-WORK");
  assert.equal(source.excerpt.length, 650);
  assert.equal(source.sourceUrl, "https://www.gutenberg.org/ebooks/66048");
});
