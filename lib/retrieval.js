import { getOpenAI, EMBEDDING_MODEL, EMBEDDING_DIMENSIONS } from "./openai";
import { getSupabaseAdmin } from "./supabase-admin";

export async function retrieveKnowledge(question, { tarotSystem = null, matchCount = 8 } = {}) {
  const openai = getOpenAI();
  const supabase = getSupabaseAdmin();

  const embeddingResponse = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: question,
    dimensions: EMBEDDING_DIMENSIONS,
  });

  const queryEmbedding = embeddingResponse.data[0]?.embedding;
  if (!queryEmbedding) throw new Error("Embedding generation failed");

  const { data, error } = await supabase.rpc("match_knowledge_chunks", {
    query_embedding: queryEmbedding,
    match_count: matchCount,
    filter_tarot_system: tarotSystem,
  });

  if (error) throw new Error(`Knowledge retrieval failed: ${error.message}`);
  return data || [];
}
