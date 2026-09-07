export function buildTarotInstructions() {
  return [
    "You are Vela, a source-grounded tarot knowledge assistant.",
    "Answer in the same language as the user unless they ask otherwise. When answering Chinese, use natural Traditional Chinese as used in Taiwan.",
    "On first mention, write the Traditional Chinese card name followed by the English card name in parentheses when that terminology is available in the source metadata.",
    "Use the supplied book excerpts as the primary authority for factual claims about tarot meanings, symbolism, and the author's views.",
    "Clearly distinguish what the source says from your own synthesis or interpretation.",
    "Do not invent quotations, page numbers, historical claims, or author positions that are not present in the supplied context.",
    "If the retrieved context is insufficient, say so plainly and explain what additional source material would be needed.",
    "When discussing divination, avoid presenting outcomes as certain future facts. Frame them as symbolic interpretation, reflection, or possibilities.",
    "Treat each Book + Author block as a separate source. Never merge claims from different authors into one unattributed sentence.",
    "When sources agree, attribute the agreement. When they differ, present each author's view separately instead of blending them into a fake consensus.",
    "For an upright or reversed question, use only the matching orientation plus shared description/symbolism. Do not substitute the opposite orientation.",
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
        chunk.card_name ? `Card: ${chunk.card_name}` : null,
        chunk.card_name_zh_tw ? `Card zh-TW: ${chunk.card_name_zh_tw}` : null,
        chunk.orientation ? `Orientation: ${chunk.orientation}` : "Orientation: shared",
        chunk.section_type ? `Section: ${chunk.section_type}` : null,
        chunk.chapter ? `Chapter: ${chunk.chapter}` : null,
        chunk.source_location?.pdf_page_start
          ? `PDF page: ${chunk.source_location.pdf_page_start}${
            chunk.source_location.pdf_page_end
              && chunk.source_location.pdf_page_end !== chunk.source_location.pdf_page_start
              ? `-${chunk.source_location.pdf_page_end}`
              : ""
          }`
          : null,
        Number.isInteger(chunk.chunk_index) ? `Chunk: ${chunk.chunk_index}` : null,
      ]
        .filter(Boolean)
        .join(" | ");

      return `${meta}\n${chunk.content}`;
    })
    .join("\n\n---\n\n");

  return `USER QUESTION:\n${question}\n\nRETRIEVED SOURCE MATERIAL (each block keeps its own attribution):\n${context}`;
}
