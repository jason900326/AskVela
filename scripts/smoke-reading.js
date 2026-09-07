import { randomUUID } from "node:crypto";
import { createTarotDraw } from "../lib/tarot-draw.js";
import { interpretTarotReading } from "../lib/reading-interpreter.js";

const question = String(process.argv[2] || "這段關係中，我現在最需要留意什麼？").trim();
const spreadId = String(process.argv[3] || "situation-obstacle-advice").trim();
const requestId = randomUUID();

const draw = createTarotDraw({
  question,
  spreadId,
  idempotencyKey: requestId,
});

console.log("=== AskVela Phase 3 live reading smoke ===");
console.log(`Question: ${question}`);
console.log(`Spread: ${spreadId}`);
console.log(`Request ID: ${requestId}`);
console.log(`Reading ID: ${draw.readingId}`);
console.log("Draw:");
for (const card of draw.cards) {
  console.log(`- ${card.positionLabelZhTw}: ${card.nameZhTw} (${card.nameEn}) · ${card.orientation}`);
}

const reading = await interpretTarotReading({
  question,
  spreadId,
  requestId,
  readingId: draw.readingId,
});

if (reading.readingId !== draw.readingId) {
  throw new Error("Smoke test failed: interpretation changed the reading ID.");
}
if (reading.cards.length !== draw.cards.length) {
  throw new Error("Smoke test failed: interpretation card count does not match the draw.");
}

for (const [index, card] of reading.cards.entries()) {
  const drawn = draw.cards[index];
  if (card.cardId !== drawn.cardId || card.orientation !== drawn.orientation || card.position !== drawn.position) {
    throw new Error(`Smoke test failed: interpreted card ${index + 1} does not match the fixed draw.`);
  }

  const books = new Set((card.sources || []).map((source) => source.book).filter(Boolean));
  if (books.size < 2) {
    throw new Error(`Smoke test failed: ${card.nameEn} did not retain evidence from both V1 source books.`);
  }
}

const outputText = JSON.stringify(reading);
if (/\b(?:wicked man|bad woman|vicious man|dangerous man|shady character)\b/iu.test(outputText)) {
  throw new Error("Smoke test failed: archaic direct person-label wording leaked into the reading output.");
}

console.log("\nPASS: fixed draw was preserved, both V1 books were represented for every card, and no blocked archaic person labels leaked.");
console.log("\nStructured interpretation:\n");
console.log(JSON.stringify(reading, null, 2));
