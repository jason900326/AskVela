import { getOpenAI, EMBEDDING_MODEL, EMBEDDING_DIMENSIONS } from "./openai.js";
import { getSupabaseAdmin } from "./supabase-admin.js";
import { identifyTarotQuery } from "./tarot-cards.js";

async function resolveBookIds(supabase, { bookIds, bookSlugs }) {
  if (Array.isArray(bookIds)) return bookIds;
  if (!Array.isArray(bookSlugs) || bookSlugs.length === 0) return null;

  const { data, error } = await supabase
    .from("books")
    .select("id, slug")
    .in("slug", bookSlugs);
  if (error) throw new Error(`Tarot source lookup failed: ${error.message}`);

  const bySlug = new Map((data || []).map((book) => [book.slug, book.id]));
  return bookSlugs.map((slug) => bySlug.get(slug)).filter(Boolean);
}

export async function retrieveKnowledge(
  question,
  {
    tarotSystem = null,
    matchCount = 8,
    cardIds = null,
    orientation = null,
    bookIds = null,
    bookSlugs = null,
    balanceBooks = false,
  } = {},
) {
  const openai = getOpenAI();
  const supabase = getSupabaseAdmin();
  const identified = identifyTarotQuery(question);
  const resolvedCardIds = Array.isArray(cardIds) ? cardIds : identified.cardIds;
  const resolvedOrientation = orientation || identified.orientation;
  const resolvedBookIds = await resolveBookIds(supabase, { bookIds, bookSlugs });

  if (Array.isArray(bookSlugs) && bookSlugs.length > 0 && resolvedBookIds.length === 0) {
    return [];
  }

  const embeddingResponse = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: question,
    dimensions: EMBEDDING_DIMENSIONS,
  });

  const queryEmbedding = embeddingResponse.data[0]?.embedding;
  if (!queryEmbedding) throw new Error("Embedding generation failed");

  const cardFilters = resolvedCardIds.length > 1
    ? resolvedCardIds.map((cardId) => [cardId])
    : [resolvedCardIds.length ? resolvedCardIds : null];
  const bookFilters = balanceBooks && Array.isArray(resolvedBookIds) && resolvedBookIds.length > 1
    ? resolvedBookIds.map((bookId) => [bookId])
    : [resolvedBookIds];
  const divisor = Math.max(1, cardFilters.length * bookFilters.length);
  const perFilterCount = Math.max(3, Math.ceil(matchCount / divisor));

  const results = await Promise.all(cardFilters.flatMap((filterCardIds) => (
    bookFilters.map(async (filterBookIds) => {
      const { data, error } = await supabase.rpc("match_structured_tarot_chunks", {
        query_embedding: queryEmbedding,
        filter_card_ids: filterCardIds,
        match_count: perFilterCount,
        filter_orientation: resolvedOrientation,
        filter_tarot_system: tarotSystem,
        filter_book_ids: filterBookIds,
      });
      if (error) throw new Error(`Structured tarot retrieval failed: ${error.message}`);
      return data || [];
    })
  )));

  return results.flat();
}
