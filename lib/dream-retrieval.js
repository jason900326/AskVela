import { retrieveKnowledge } from "./retrieval.js";

export const FREUD_DREAM_BOOK_SLUG = "freud-interpretation-of-dreams-1913";

function compactList(items = []) {
  return items.map((item) => String(item || "").trim()).filter(Boolean).join(", ");
}

export function buildDreamRetrievalQuery({ dreamText, wakingLifeContext = "", extraction = {} }) {
  const parts = [
    `Dream report: ${String(dreamText || "").trim()}`,
    extraction?.summary ? `Dream summary: ${extraction.summary}` : "",
    extraction?.notableImages?.length ? `Notable dream images: ${compactList(extraction.notableImages)}` : "",
    extraction?.actions?.length ? `Actions: ${compactList(extraction.actions)}` : "",
    extraction?.emotions?.length ? `Emotions: ${compactList(extraction.emotions)}` : "",
    wakingLifeContext ? `Waking-life context: ${String(wakingLifeContext).trim()}` : "",
    "Freud dream interpretation: method of interpretation, free association, manifest and latent dream-content, dream-work, condensation, displacement, recent impressions and sources of dreams.",
  ];

  return parts.filter(Boolean).join("\n");
}

export function publicFreudDreamPassages(chunks = []) {
  return chunks.map((chunk, index) => ({
    id: `freud-rag-${chunk.chunk_index ?? index}`,
    bookId: chunk.book_id || null,
    bookTitle: chunk.book_title || "The Interpretation of Dreams",
    author: chunk.author || "Sigmund Freud",
    chunkIndex: Number.isInteger(chunk.chunk_index) ? chunk.chunk_index : index,
    chapter: chunk.chapter || null,
    similarity: typeof chunk.similarity === "number" ? chunk.similarity : null,
    sourceLocation: chunk.source_location || {},
    excerpt: String(chunk.content || "").trim().slice(0, 900),
  }));
}

export async function retrieveFreudDreamPassages(
  { dreamText, wakingLifeContext = "", extraction = {} },
  { matchCount = 8, retrieve = retrieveKnowledge } = {},
) {
  const query = buildDreamRetrievalQuery({ dreamText, wakingLifeContext, extraction });
  const chunks = await retrieve(query, {
    bookSlugs: [FREUD_DREAM_BOOK_SLUG],
    cardIds: [],
    orientation: null,
    tarotSystem: null,
    matchCount,
    balanceBooks: false,
  });

  return Array.isArray(chunks) ? chunks.filter((chunk) => String(chunk?.content || "").trim()) : [];
}
