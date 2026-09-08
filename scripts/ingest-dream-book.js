import { readFile } from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const metadataPath = process.argv[2];
const textPath = process.argv[3];

if (!metadataPath || !textPath) {
  console.error("Usage: npm run ingest:dream -- data/metadata/book.json data/raw/public-domain/dream/book.txt");
  process.exit(1);
}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 1536;

if (!OPENAI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing OPENAI_API_KEY or Supabase server environment variables.");
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function stripGutenbergWrapper(raw) {
  const startMarker = "*** START OF THE PROJECT GUTENBERG EBOOK THE INTERPRETATION OF DREAMS ***";
  const endMarker = "*** END OF THE PROJECT GUTENBERG EBOOK THE INTERPRETATION OF DREAMS ***";
  const start = raw.indexOf(startMarker);
  const end = raw.indexOf(endMarker);
  const bodyStart = start >= 0 ? start + startMarker.length : 0;
  const bodyEnd = end > bodyStart ? end : raw.length;
  return raw.slice(bodyStart, bodyEnd).replace(/\r\n/g, "\n").trim();
}

const CHAPTER_HEADINGS = [
  ["I", "THE SCIENTIFIC LITERATURE ON THE PROBLEMS OF THE DREAM"],
  ["II", "METHOD OF DREAM INTERPRETATION"],
  ["III", "THE DREAM IS THE FULFILMENT OF A WISH"],
  ["IV", "DISTORTION IN DREAMS"],
  ["V", "THE MATERIAL AND SOURCES OF DREAMS"],
  ["VI", "THE DREAM-WORK"],
  ["VII", "THE PSYCHOLOGY OF THE DREAM ACTIVITIES"],
];

function chapterRanges(text) {
  const markers = CHAPTER_HEADINGS.map(([number, title]) => {
    const titleIndex = text.indexOf(title);
    if (titleIndex < 0) return null;
    return { number, title, start: titleIndex };
  }).filter(Boolean).sort((a, b) => a.start - b.start);

  if (!markers.length) return [{ number: null, title: "The Interpretation of Dreams", start: 0, end: text.length }];

  return markers.map((marker, index) => ({
    ...marker,
    end: markers[index + 1]?.start ?? text.length,
  }));
}

function findNaturalBreak(text, proposedEnd, start) {
  if (proposedEnd >= text.length) return text.length;
  const searchStart = Math.max(start + 1200, proposedEnd - 750);
  const window = text.slice(searchStart, proposedEnd);
  const candidates = ["\n\n", ". ", "? ", "! ", "; ", ": "];
  let best = -1;
  let width = 0;
  for (const candidate of candidates) {
    const index = window.lastIndexOf(candidate);
    if (index > best) {
      best = index;
      width = candidate.length;
    }
  }
  return best >= 0 ? searchStart + best + width : proposedEnd;
}

function chunkChapter(text, chapter, targetSize = 3200, overlap = 420) {
  const chunks = [];
  let localStart = chapter.start;
  while (localStart < chapter.end) {
    const proposedEnd = Math.min(localStart + targetSize, chapter.end);
    const end = findNaturalBreak(text, proposedEnd, localStart);
    const content = text.slice(localStart, end).trim();
    if (content.length >= 120) {
      chunks.push({
        content,
        chapter: chapter.number ? `${chapter.number}. ${chapter.title}` : chapter.title,
        charStart: localStart,
        charEnd: end,
      });
    }
    if (end >= chapter.end) break;
    localStart = Math.max(end - overlap, localStart + 1);
  }
  return chunks;
}

const metadata = JSON.parse(await readFile(path.resolve(metadataPath), "utf8"));
const rawText = await readFile(path.resolve(textPath), "utf8");
const text = stripGutenbergWrapper(String(rawText));

for (const required of ["slug", "title"]) {
  if (!metadata[required]) throw new Error(`Book metadata is missing: ${required}`);
}
if (!text.includes("SIGMUND FREUD") || text.length < 500000) {
  throw new Error("Dream source text does not look like the expected Freud Gutenberg edition.");
}

const { data: book, error: bookError } = await supabase
  .from("books")
  .upsert(
    {
      slug: metadata.slug,
      title: metadata.title,
      author: metadata.author || null,
      tarot_system: null,
      publication_year: metadata.publication_year || null,
      public_domain: Boolean(metadata.public_domain),
      metadata: metadata.metadata || {},
      updated_at: new Date().toISOString(),
    },
    { onConflict: "slug" },
  )
  .select("id, title")
  .single();

if (bookError) throw new Error(`Book upsert failed: ${bookError.message}`);

const { error: deleteError } = await supabase
  .from("knowledge_chunks")
  .delete()
  .eq("book_id", book.id);
if (deleteError) throw new Error(`Old Dream chunk cleanup failed: ${deleteError.message}`);

const chunks = chapterRanges(text)
  .flatMap((chapter) => chunkChapter(text, chapter))
  .map((chunk, chunkIndex) => ({ ...chunk, chunkIndex }));

console.log(`Book: ${book.title}`);
console.log(`Prepared ${chunks.length} Dream chunks from ${text.length.toLocaleString()} characters.`);

const batchSize = 32;
for (let offset = 0; offset < chunks.length; offset += batchSize) {
  const batch = chunks.slice(offset, offset + batchSize);
  const embeddingResponse = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: batch.map((chunk) => chunk.content),
    dimensions: EMBEDDING_DIMENSIONS,
  });

  const rows = batch.map((chunk, batchIndex) => ({
    book_id: book.id,
    chunk_index: chunk.chunkIndex,
    content: chunk.content,
    chapter: chunk.chapter,
    card_name: null,
    card_id: null,
    orientation: null,
    section_type: "dream_source_text",
    token_estimate: Math.ceil(chunk.content.length / 4),
    embedding: embeddingResponse.data[batchIndex].embedding,
    source_location: {
      chapter: chunk.chapter,
      char_start: chunk.charStart,
      char_end: chunk.charEnd,
      gutenberg_ebook: metadata.metadata?.gutenberg_ebook || null,
    },
    metadata: {
      source_file: path.basename(textPath),
      source_url: metadata.metadata?.source_url || null,
      retrieval_role: "dream_primary_source",
    },
  }));

  const { error: insertError } = await supabase.from("knowledge_chunks").insert(rows);
  if (insertError) throw new Error(`Dream chunk insert failed: ${insertError.message}`);

  console.log(`Embedded ${Math.min(offset + batch.length, chunks.length)}/${chunks.length}`);
}

console.log("Dream full-book ingestion complete.");
