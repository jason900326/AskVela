import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readingPath = new URL("../lib/dream-reading.js", import.meta.url);
const flowPath = new URL("../components/DreamReadingFlow.js", import.meta.url);
const ingestPath = new URL("../scripts/ingest-dream-book.js", import.meta.url);
const metadataPath = new URL("../data/metadata/freud-interpretation-of-dreams-1913.json", import.meta.url);

test("Dream reading attempts Freud full-book retrieval and exposes an honest fallback", async () => {
  const reading = await readFile(readingPath, "utf8");
  assert.match(reading, /retrieveFreudDreamPassages/u);
  assert.match(reading, /retrievedSources/u);
  assert.match(reading, /fullRagMode/u);
  assert.match(reading, /fallbackMode/u);
  assert.match(reading, /Retrieval failure must not erase the user's Dream session/u);
});

test("Dream UI keeps Freud source details collapsed and distinguishes full retrieval", async () => {
  const flow = await readFile(flowPath, "utf8");
  assert.match(flow, /<details className="dreamDetails dreamSourcesCompact">/u);
  assert.match(flow, /freud-full-book-rag/u);
  assert.match(flow, /解讀依據 · Freud 原文檢索/u);
  assert.match(flow, /retrievedSources\.slice\(0, 4\)/u);
});

test("Freud source metadata points at the verified Gutenberg 66048 edition", async () => {
  const metadata = JSON.parse(await readFile(metadataPath, "utf8"));
  assert.equal(metadata.slug, "freud-interpretation-of-dreams-1913");
  assert.equal(metadata.metadata.gutenberg_ebook, 66048);
  assert.equal(metadata.metadata.source_url, "https://www.gutenberg.org/ebooks/66048");
  assert.equal(metadata.metadata.plain_text_url, "https://www.gutenberg.org/cache/epub/66048/pg66048.txt");
});

test("Dream ingestion strips Gutenberg boilerplate and writes vector chunks with source locations", async () => {
  const ingest = await readFile(ingestPath, "utf8");
  assert.match(ingest, /stripGutenbergWrapper/u);
  assert.match(ingest, /knowledge_chunks/u);
  assert.match(ingest, /section_type: "dream_source_text"/u);
  assert.match(ingest, /source_location/u);
  assert.match(ingest, /embeddingResponse/u);
});
