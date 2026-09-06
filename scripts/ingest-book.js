import { readFile } from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const metadataPath = process.argv[2];
const textPath = process.argv[3];

if (!metadataPath || !textPath) {
  console.error(
    "Usage: npm run ingest -- data/metadata/book.json data/processed/book.txt",
  );
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

function findNaturalBreak(text, proposedEnd, start) {
  if (proposedEnd >= text.length) return text.length;

  const searchStart = Math.max(start + 1400, proposedEnd - 700);
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

function chunkText(text, targetSize = 3400, overlap = 450) {
  const chunks = [];
  let start = 0;
  let index = 0;

  while (start < text.length) {
    const proposedEnd = Math.min(start + targetSize, text.length);
    const end = findNaturalBreak(text, proposedEnd, start);
    const content = text.slice(start, end).trim();

    if (content.length >= 100) {
      chunks.push({
        chunkIndex: index,
        content,
        charStart: start,
        charEnd: end,
      });
      index += 1;
    }

    if (end >= text.length) break;
    start = Math.max(end - overlap, start + 1);
  }

  return chunks;
}

const metadata = JSON.parse(await readFile(path.resolve(metadataPath), "utf8"));
const text = String(await readFile(path.resolve(textPath), "utf8")).trim();

for (const required of ["slug", "title"]) {
  if (!metadata[required]) throw new Error(`Book metadata is missing: ${required}`);
}

const { data: book, error: bookError } = await supabase
  .from("books")
  .upsert(
    {
      slug: metadata.slug,
      title: metadata.title,
      author: metadata.author || null,
      tarot_system: metadata.tarot_system || null,
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

if (deleteError) throw new Error(`Old chunk cleanup failed: ${deleteError.message}`);

const chunks = chunkText(text);
console.log(`Book: ${book.title}`);
console.log(`Prepared ${chunks.length} chunks from ${text.length.toLocaleString()} characters.`);

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
    chapter: null,
    card_name: null,
    section_type: "source_text",
    token_estimate: Math.ceil(chunk.content.length / 4),
    embedding: embeddingResponse.data[batchIndex].embedding,
    metadata: {
      source_file: path.basename(textPath),
      char_start: chunk.charStart,
      char_end: chunk.charEnd,
    },
  }));

  const { error: insertError } = await supabase.from("knowledge_chunks").insert(rows);
  if (insertError) throw new Error(`Chunk insert failed: ${insertError.message}`);

  console.log(`Embedded ${Math.min(offset + batch.length, chunks.length)}/${chunks.length}`);
}

console.log("Ingestion complete.");
