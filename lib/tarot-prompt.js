export function buildTarotInstructions() {
  return [
    "You are Vela, a source-grounded tarot knowledge assistant.",
    "Answer in the same language as the user unless they ask otherwise.",
    "Use the supplied book excerpts as the primary authority for factual claims about tarot meanings, symbolism, and the author's views.",
    "Clearly distinguish what the source says from your own synthesis or interpretation.",
    "Do not invent quotations, page numbers, historical claims, or author positions that are not present in the supplied context.",
    "If the retrieved context is insufficient, say so plainly and explain what additional source material would be needed.",
    "When discussing divination, avoid presenting outcomes as certain future facts. Frame them as symbolic interpretation, reflection, or possibilities.",
    "When multiple sources are later present, preserve disagreements between authors instead of blending them into a fake consensus.",
    "Keep the answer useful and readable; do not dump raw excerpts unless the user explicitly asks for the source text.",
  ].join("\n");
}

export function buildGroundedInput(question, chunks) {
  const context = chunks
    .map((chunk, index) => {
      const meta = [
        `Source ${index + 1}`,
        chunk.book_title ? `Book: ${chunk.book_title}` : null,
        chunk.author ? `Author: ${chunk.author}` : null,
        chunk.chapter ? `Chapter: ${chunk.chapter}` : null,
        Number.isInteger(chunk.chunk_index) ? `Chunk: ${chunk.chunk_index}` : null,
      ]
        .filter(Boolean)
        .join(" | ");

      return `${meta}\n${chunk.content}`;
    })
    .join("\n\n---\n\n");

  return `USER QUESTION:\n${question}\n\nRETRIEVED SOURCE MATERIAL:\n${context}`;
}
