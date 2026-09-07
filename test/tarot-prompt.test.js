import assert from "node:assert/strict";
import test from "node:test";
import { buildGroundedInput, buildTarotInstructions } from "../lib/tarot-prompt.js";

test("knowledge prompt marks curated retrieval text as non-verbatim", () => {
  const instructions = buildTarotInstructions();
  assert.match(instructions, /not guaranteed to be a verbatim quotation/iu);
  assert.match(instructions, /Never format retrieved wording as a direct quotation or Markdown blockquote/iu);
});

test("grounded input labels source material as curated retrieval text", () => {
  const input = buildGroundedInput("Mathers 如何解讀 Queen of Swords 逆位？", [{
    book_title: "The Tarot",
    author: "S. L. MacGregor Mathers",
    card_name: "Queen of Swords",
    card_name_zh_tw: "寶劍皇后",
    orientation: "reversed",
    section_type: "divinatory_meaning",
    chapter: "Meanings of the Cards",
    source_location: { pdf_page_start: 15 },
    chunk_index: 1,
    content: "harsh conflict, rigid attitudes, or intolerance",
  }]);

  assert.match(input, /Material status: curated retrieval text; source-grounded but not guaranteed verbatim/iu);
});
