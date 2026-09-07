import { readFile } from "node:fs/promises";
import path from "node:path";
import { validateTarotRegistry } from "../lib/tarot-cards.js";
import { validateStructuredTarot } from "../lib/waite-structure-parser.js";

const structuredPath = process.argv[2];
const registryErrors = validateTarotRegistry();

if (!structuredPath) {
  if (registryErrors.length) throw new Error(registryErrors.join("\n"));
  console.log("Canonical tarot registry is valid: 78 cards.");
  process.exit(0);
}

const structured = JSON.parse(await readFile(path.resolve(structuredPath), "utf8"));
const errors = [...registryErrors, ...validateStructuredTarot(structured)];
if (errors.length) throw new Error(`Validation failed:\n- ${errors.join("\n- ")}`);

console.log(`Structured tarot source is valid: ${structured.cards.length} cards.`);
