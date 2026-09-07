import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PDFParse } from "pdf-parse";
import { parseWaiteStructure, validateStructuredTarot } from "../lib/waite-structure-parser.js";

const metadata = {
  slug: "the-pictorial-key-to-the-tarot",
  title: "The Pictorial Key to the Tarot",
  author: "Arthur Edward Waite",
  tarot_system: "Rider-Waite-Smith",
};

async function extractCommittedWaitePdf() {
  const data = await readFile("data/raw/public-domain/The-Pictorial-Key-to-the-Tarot.pdf");
  const parser = new PDFParse({ data });
  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}

test("parses all 78 cards from the committed Waite source", async () => {
  const structured = parseWaiteStructure(await extractCommittedWaitePdf(), metadata);
  assert.equal(structured.cards.length, 78);
  assert.deepEqual(validateStructuredTarot(structured), []);

  const tower = structured.cards.find((card) => card.card_id === "major-16-tower");
  assert.match(
    tower.sections.find((section) => section.orientation === "reversed").content,
    /oppression, imprisonment, tyranny/iu,
  );

  const twoOfCups = structured.cards.find((card) => card.card_id === "minor-cups-two");
  assert.match(
    twoOfCups.sections.find(
      (section) => section.orientation === "reversed"
        && section.section_type === "additional_divinatory_meaning",
    ).content,
    /Passion/iu,
  );
});
