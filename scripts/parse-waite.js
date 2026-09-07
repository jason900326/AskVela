import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseWaiteStructure } from "../lib/waite-structure-parser.js";

const metadataPath = process.argv[2];
const textPath = process.argv[3];
const outputPath = process.argv[4];

if (!metadataPath || !textPath) {
  console.error(
    "Usage: npm run parse:waite -- data/metadata/book.json data/processed/book.txt [data/processed/book.structured.json]",
  );
  process.exit(1);
}

const resolvedOutput = path.resolve(
  outputPath || textPath.replace(/\.txt$/iu, ".structured.json"),
);
const metadata = JSON.parse(await readFile(path.resolve(metadataPath), "utf8"));
const text = await readFile(path.resolve(textPath), "utf8");
const structured = parseWaiteStructure(text, metadata);

await mkdir(path.dirname(resolvedOutput), { recursive: true });
await writeFile(resolvedOutput, `${JSON.stringify(structured, null, 2)}\n`, "utf8");

const sectionCount = structured.cards.reduce(
  (total, card) => total + card.sections.length,
  0,
);
console.log(`Parsed ${structured.cards.length} cards and ${sectionCount} source sections.`);
console.log(`Saved: ${resolvedOutput}`);
