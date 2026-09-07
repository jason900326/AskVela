import test from "node:test";
import assert from "node:assert/strict";
import { parseMathersStructure } from "../lib/mathers-structure-parser.js";
import { validateStructuredTarotSource } from "../lib/structured-tarot-validation.js";

const numbers = [
  ...Array.from({ length: 20 }, (_, index) => index + 1),
  0,
  ...Array.from({ length: 57 }, (_, index) => index + 21),
];

function entryFor(number) {
  const heading = number === 1 ? "The Juggler" : `Card ${number}`;
  if (number === 50) {
    return `${number}. ${heading}.--Power, Command, Authority; R. A Wicked Man, Chagrin, Worry, Fear.`;
  }
  if (number === 51) {
    return `${number}. ${heading}.--Loss, Privation, Separation; R. A Bad Woman, ill-tempered and bigoted, Discord.`;
  }
  if (number === 55) {
    return `${number}. ${heading}.--Conscience, Probity, Good Faith; R. Suspicion, Fear, Doubt, Shady character.`;
  }
  if (number === 64) {
    return `${number}. ${heading}.--Victory, Bravery, Courage; R. An old and vicious Man, a Dangerous Man, Doubt, Fear.`;
  }
  if (number === 65) {
    return `${number}. ${heading}.--Liberality, Generosity; R. Certain Evil, a suspicious Woman, a Woman justly regarded with Suspicion, Doubt.`;
  }
  return `${number}. ${heading}.--Meaning ${number}, useful context; R. Reversed meaning ${number}, useful context.`;
}

const fixture = [
  "THE TAROT",
  "MEANINGS OF THE CARDS",
  ...numbers.map(entryFor),
  "The following additional remarks may be serviceable.",
].join("\n");

const metadata = {
  slug: "the-tarot-macgregor-mathers-1888",
  title: "The Tarot",
  author: "S. L. MacGregor Mathers",
  tarot_system: "Pre-RWS Continental",
  metadata: {},
};

test("Mathers parser produces 78 meanings-only cards with upright and reversed sections", () => {
  const structured = parseMathersStructure(fixture, metadata);

  assert.equal(structured.cards.length, 78);
  assert.equal(structured.coverage_profile, "meanings_only");
  assert.deepEqual(validateStructuredTarotSource(structured), []);

  for (const card of structured.cards) {
    assert.equal(card.sections.length, 2);
    assert.ok(card.sections.some((section) => section.orientation === "upright"));
    assert.ok(card.sections.some((section) => section.orientation === "reversed"));
  }
});

test("Mathers parser curates direct person judgments before structured output", () => {
  const structured = parseMathersStructure(fixture, metadata);
  const swordKing = structured.cards.find((card) => card.card_id === "minor-swords-king");
  const swordQueen = structured.cards.find((card) => card.card_id === "minor-swords-queen");
  const pentaclesKing = structured.cards.find((card) => card.card_id === "minor-pentacles-king");
  const pentaclesQueen = structured.cards.find((card) => card.card_id === "minor-pentacles-queen");

  const combined = [swordKing, swordQueen, pentaclesKing, pentaclesQueen]
    .flatMap((card) => card.sections.map((section) => section.content))
    .join(" ");

  assert.doesNotMatch(combined, /Wicked Man|Bad Woman|vicious Man|Dangerous Man|suspicious Woman/iu);
  assert.match(combined, /harmful conduct|harsh conflict|grounds for caution/iu);
});
