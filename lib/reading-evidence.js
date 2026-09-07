import { retrieveKnowledge } from "./retrieval.js";

const MAX_CHUNK_CHARACTERS = 2800;

export class ReadingEvidenceError extends Error {
  constructor(message, code = "READING_EVIDENCE_INSUFFICIENT") {
    super(message);
    this.name = "ReadingEvidenceError";
    this.code = code;
  }
}

function orientationLabel(orientation) {
  return orientation === "reversed" ? "逆位 reversed" : "正位 upright";
}

function sourceKey(chunk) {
  return chunk.id || [
    chunk.book_id,
    chunk.card_id,
    chunk.orientation,
    chunk.section_type,
    chunk.chunk_index,
  ].join(":");
}

function normalizeChunk(chunk, sourceId) {
  return {
    sourceId,
    bookId: chunk.book_id,
    bookTitle: chunk.book_title,
    author: chunk.author,
    tarotSystem: chunk.tarot_system,
    chapter: chunk.chapter,
    cardId: chunk.card_id,
    cardName: chunk.card_name,
    cardNameZhTw: chunk.card_name_zh_tw,
    orientation: chunk.orientation,
    sectionType: chunk.section_type,
    sourceLocation: chunk.source_location || {},
    chunkIndex: chunk.chunk_index,
    content: String(chunk.content || "").slice(0, MAX_CHUNK_CHARACTERS),
  };
}

function dedupeChunks(chunks) {
  const seen = new Set();
  const unique = [];
  for (const chunk of chunks) {
    const key = sourceKey(chunk);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(chunk);
  }
  return unique;
}

export function balanceEvidenceAcrossBooks(chunks, limit = 8) {
  const groups = new Map();
  for (const chunk of dedupeChunks(chunks)) {
    const bookKey = chunk.book_id || chunk.book_title || "unknown-book";
    if (!groups.has(bookKey)) groups.set(bookKey, []);
    groups.get(bookKey).push(chunk);
  }

  const selected = [];
  let round = 0;
  while (selected.length < limit) {
    let added = false;
    for (const group of groups.values()) {
      const chunk = group[round];
      if (!chunk) continue;
      selected.push(chunk);
      added = true;
      if (selected.length >= limit) break;
    }
    if (!added) break;
    round += 1;
  }

  return selected;
}

export function buildReadingEvidenceQuery(question, card) {
  return [
    question,
    `${card.nameZhTw} (${card.nameEn})`,
    card.positionLabelZhTw,
    orientationLabel(card.orientation),
    "牌面象徵與占卜牌義 symbolism divinatory meaning",
  ].filter(Boolean).join("\n");
}

export async function retrieveReadingEvidence(
  draw,
  {
    retriever = retrieveKnowledge,
    tarotSystem = "Rider-Waite-Smith",
    bookIds = null,
    matchCountPerCard = 12,
    evidenceLimitPerCard = 8,
  } = {},
) {
  const cards = await Promise.all(draw.cards.map(async (card, cardIndex) => {
    const chunks = await retriever(buildReadingEvidenceQuery(draw.question, card), {
      tarotSystem,
      matchCount: matchCountPerCard,
      cardIds: [card.cardId],
      orientation: card.orientation,
      bookIds,
    });

    const balanced = balanceEvidenceAcrossBooks(chunks, evidenceLimitPerCard);
    const evidence = balanced.map((chunk, evidenceIndex) => normalizeChunk(
      chunk,
      `card-${cardIndex + 1}-source-${evidenceIndex + 1}`,
    ));

    if (evidence.length === 0) {
      throw new ReadingEvidenceError(
        `知識庫找不到「${card.nameZhTw}（${card.nameEn}）」${orientationLabel(card.orientation)}的足夠原典資料。`,
      );
    }

    return { ...card, evidence };
  }));

  return { ...draw, cards };
}

export function toHumanSourceReference(source) {
  const start = source.sourceLocation?.pdf_page_start;
  const end = source.sourceLocation?.pdf_page_end;
  const page = start
    ? `PDF 第 ${start}${end && end !== start ? `–${end}` : ""} 頁`
    : null;

  return {
    sourceId: source.sourceId,
    book: source.bookTitle,
    author: source.author,
    tarotSystem: source.tarotSystem,
    chapter: source.chapter,
    sectionType: source.sectionType,
    orientation: source.orientation,
    page,
  };
}

