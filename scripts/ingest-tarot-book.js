import { readFile } from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { TAROT_CARDS } from "../lib/tarot-cards.js";
import { validateStructuredTarotSource } from "../lib/structured-tarot-validation.js";
import {
  assertCuratedSourceMeaning,
  curateSourceMeaning,
  SOURCE_CURATION_VERSION,
} from "../lib/source-curation.js";

const metadataPath = process.argv[2];
const structuredPath = process.argv[3];

if (!metadataPath || !structuredPath) {
  console.error(
    "Usage: npm run ingest:tarot -- data/metadata/book.json data/processed/book.structured.json",
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
  const searchStart = Math.max(start + 900, proposedEnd - 500);
  const window = text.slice(searchStart, proposedEnd);
  const breakAt = Math.max(
    ...["\n\n", ". ", "? ", "! ", "; "].map((candidate) => window.lastIndexOf(candidate)),
  );
  return breakAt >= 0 ? searchStart + breakAt + 1 : proposedEnd;
}

function splitSection(content, targetSize = 2800, overlap = 250) {
  const parts = [];
  let start = 0;
  while (start < content.length) {
    const end = findNaturalBreak(content, Math.min(start + targetSize, content.length), start);
    const part = content.slice(start, end).trim();
    if (part) parts.push({ content: part, charStart: start, charEnd: end });
    if (end >= content.length) break;
    start = Math.max(start + 1, end - overlap);
  }
  return parts;
}

function curateSection(card, section) {
  const curated = curateSourceMeaning(section.content);
  assertCuratedSourceMeaning(
    curated.content,
    `${card.card_id}/${section.section_type}/${section.orientation || "shared"}`,
  );

  return {
    content: curated.content,
    curation: {
      version: SOURCE_CURATION_VERSION,
      changed: Boolean(section.curation?.changed || curated.changed),
      actions: [...new Set([
        ...(section.curation?.actions || []),
        ...curated.actions,
      ])],
    },
  };
}

const metadata = JSON.parse(await readFile(path.resolve(metadataPath), "utf8"));
const structured = JSON.parse(await readFile(path.resolve(structuredPath), "utf8"));
const validationErrors = validateStructuredTarotSource(structured);
if (validationErrors.length) {
  throw new Error(`Structured tarot validation failed:\n- ${validationErrors.join("\n- ")}`);
}
if (structured.book?.slug !== metadata.slug) {
  throw new Error("Structured source book slug does not match the metadata file.");
}

const { error: cardError } = await supabase.from("tarot_cards").upsert(
  TAROT_CARDS.map((card) => ({
    card_id: card.card_id,
    name_en: card.name_en,
    name_zh_tw: card.name_zh_tw,
    arcana: card.arcana,
    number_or_rank: card.number_or_rank,
    suit: card.suit || null,
    court_card: Boolean(card.court_card),
    aliases: card.aliases || [],
    updated_at: new Date().toISOString(),
  })),
  { onConflict: "card_id" },
);
if (cardError) throw new Error(`Tarot card registry upsert failed: ${cardError.message}`);

const compatibleTarotSystems = Array.isArray(metadata.compatible_tarot_systems)
  ? metadata.compatible_tarot_systems
  : metadata.tarot_system
    ? [metadata.tarot_system]
    : [];

const { data: book, error: bookError } = await supabase
  .from("books")
  .upsert(
    {
      slug: metadata.slug,
      title: metadata.title,
      author: metadata.author || null,
      tarot_system: metadata.tarot_system || null,
      compatible_tarot_systems: compatibleTarotSystems,
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

let chunkIndex = 0;
let curatedSectionCount = 0;
const chunks = structured.cards.flatMap((card) => card.sections.flatMap((section, sectionIndex) => {
  const curatedSection = curateSection(card, section);
  if (curatedSection.curation.changed) curatedSectionCount += 1;

  return splitSection(curatedSection.content).map((part, partIndex) => ({
    chunkIndex: chunkIndex++,
    card,
    section,
    sectionIndex,
    partIndex,
    curation: curatedSection.curation,
    ...part,
  }));
}));

console.log(`Book: ${book.title}`);
console.log(`Prepared ${chunks.length} structured chunks for 78 cards.`);
console.log(`Source curation ${SOURCE_CURATION_VERSION}: ${curatedSectionCount} sections changed.`);

const rows = [];
const batchSize = 32;
for (let offset = 0; offset < chunks.length; offset += batchSize) {
  const batch = chunks.slice(offset, offset + batchSize);
  const embeddingResponse = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: batch.map(({ card, section, content }) => [
      `${card.name_en} (${card.name_zh_tw})`,
      `Section: ${section.section_type}`,
      section.orientation ? `Orientation: ${section.orientation}` : "Orientation: shared",
      content,
    ].join("\n")),
    dimensions: EMBEDDING_DIMENSIONS,
  });

  rows.push(...batch.map((chunk, batchIndex) => ({
    book_id: book.id,
    chunk_index: chunk.chunkIndex,
    content: chunk.content,
    chapter: chunk.section.source_location.chapter,
    card_id: chunk.card.card_id,
    card_name: chunk.card.name_en,
    section_type: chunk.section.section_type,
    orientation: chunk.section.orientation,
    source_location: chunk.section.source_location,
    token_estimate: Math.ceil(chunk.content.length / 4),
    embedding: embeddingResponse.data[batchIndex].embedding,
    metadata: {
      parser: structured.parser,
      schema_version: structured.schema_version,
      coverage_profile: structured.coverage_profile || "full_reference",
      source_file: path.basename(structuredPath),
      section_index: chunk.sectionIndex,
      part_index: chunk.partIndex,
      section_char_start: chunk.charStart,
      section_char_end: chunk.charEnd,
      source_curation: chunk.curation,
    },
  })));
  console.log(`Embedded ${Math.min(offset + batch.length, chunks.length)}/${chunks.length}`);
}

const { error: deleteError } = await supabase
  .from("knowledge_chunks")
  .delete()
  .eq("book_id", book.id);
if (deleteError) throw new Error(`Old chunk cleanup failed: ${deleteError.message}`);

for (let offset = 0; offset < rows.length; offset += 100) {
  const { error: insertError } = await supabase
    .from("knowledge_chunks")
    .insert(rows.slice(offset, offset + 100));
  if (insertError) throw new Error(`Structured chunk insert failed: ${insertError.message}`);
}

console.log("Structured tarot ingestion complete.");
