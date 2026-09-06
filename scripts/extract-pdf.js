import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { PDFParse } from "pdf-parse";

const inputPath = process.argv[2];
const outputPath = process.argv[3];

if (!inputPath) {
  console.error("Usage: npm run extract:pdf -- data/raw/book.pdf [data/processed/book.txt]");
  process.exit(1);
}

const resolvedInput = path.resolve(inputPath);
const parsedName = path.basename(inputPath, path.extname(inputPath));
const resolvedOutput = path.resolve(
  outputPath || path.join("data", "processed", `${parsedName}.txt`),
);

const buffer = await readFile(resolvedInput);
const parser = new PDFParse({ data: buffer });

try {
  const result = await parser.getText();
  const text = String(result.text || "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();

  if (!text) throw new Error("No text could be extracted from this PDF.");

  await mkdir(path.dirname(resolvedOutput), { recursive: true });
  await writeFile(resolvedOutput, `${text}\n`, "utf8");

  console.log(`Extracted ${text.length.toLocaleString()} characters.`);
  console.log(`Saved: ${resolvedOutput}`);
  if (Array.isArray(result.pages)) {
    console.log(`Pages parsed: ${result.pages.length}`);
  }
} finally {
  await parser.destroy();
}
