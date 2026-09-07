import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const flowPath = new URL("../components/TarotReadingFlow.js", import.meta.url);
const cssPath = new URL("../app/reading.css", import.meta.url);

test("Phase 4 keeps the canonical anonymous reading stages and fixed-draw retry contract", async () => {
  const source = await readFile(flowPath, "utf8");

  for (const stage of ["welcome", "question", "spread", "drawing", "reveal", "interpreting", "result"]) {
    assert.ok(
      source.includes(`stage === "${stage}"`) || source.includes(`setStage("${stage}")`),
      `missing ${stage} stage`,
    );
  }

  assert.match(source, /\/api\/spreads/u);
  assert.match(source, /\/api\/readings\/draw/u);
  assert.match(source, /\/api\/readings\/interpret/u);
  assert.match(source, /readingId: draw\.readingId/u);
  assert.match(source, /沿用同一副牌重試解讀/u);
});

test("Phase 4 uses progressive disclosure instead of forcing the full source analysis into the first view", async () => {
  const source = await readFile(flowPath, "utf8");

  assert.match(source, /className="velaSummary"/u);
  assert.match(source, /className="deepReading"/u);
  assert.match(source, /查看完整牌義與分析/u);
  assert.match(source, /card\.sourceMeaning/u);
  assert.match(source, /VELA 的建議/u);
});

test("Phase 4 keeps result typography intentionally below the original oversized treatment", async () => {
  const css = await readFile(cssPath, "utf8");

  assert.match(css, /\.resultIntro h2 \{[^}]*clamp\(1\.65rem,2\.4vw,2\.25rem\)/u);
  assert.match(css, /\.deepReading > summary/u);
  assert.match(css, /@media \(max-width: 760px\)/u);
});
