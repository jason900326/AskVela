import { getOpenAI, EMBEDDING_MODEL, EMBEDDING_DIMENSIONS } from "./openai.js";
import { getSupabaseAdmin } from "./supabase-admin.js";
import { identifyTarotQuery } from "./tarot-cards.js";

export async function retrieveKnowledge(
  question,
  {
    tarotSystem = null,
    matchCount = 8,
    cardIds = null,
    orientation = null,
    bookIds = null,
  } = {},
) {
  const openai = getOpenAI();
  const supabase = getSupabaseAdmin();
  const identified = identifyTarotQuery(question);
  const resolvedCardIds = Array.isArray(cardIds) ? cardIds : identified.cardIds;
  const resolvedOrientation = orientation || identified.orientation;

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
  const perFilterCount = resolvedCardIds.length > 1
    ? Math.max(4, Math.ceil(matchCount / resolvedCardIds.length))
    : matchCount;
  const results = await Promise.all(cardFilters.map(async (filterCardIds) => {
    const { data, error } = await supabase.rpc("match_structured_tarot_chunks", {
      query_embedding: queryEmbedding,
      filter_card_ids: filterCardIds,
      match_count: perFilterCount,
      filter_orientation: resolvedOrientation,
      filter_tarot_system: tarotSystem,
      filter_book_ids: bookIds,
    });
    if (error) throw new Error(`Structured tarot retrieval failed: ${error.message}`);
    return data || [];
  }));

  return results.flat();
}
