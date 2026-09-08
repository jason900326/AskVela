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

test("Tarot result is speech-first while complete analysis stays behind progressive disclosure", async () => {
  const source = await readFile(flowPath, "utf8");

  assert.match(source, /className="velaSummary"/u);
  assert.match(source, /className="followUpPanel"/u);
  assert.match(source, /className="deepReading"/u);
  assert.match(source, /查看完整牌義與分析/u);
  assert.match(source, /完整整理、各張牌、原典與參考來源/u);
  assert.match(source, /result\.analysisSynthesis/u);
  assert.match(source, /card\.contextInterpretation/u);
  assert.match(source, /card\.sourceMeaning/u);
  assert.match(source, /可以怎麼做/u);

  const resultStart = source.indexOf("stage === \"result\"");
  const resultSection = source.slice(resultStart);
  const introIndex = resultSection.indexOf("resultIntro");
  const followUpIndex = resultSection.indexOf("followUpPanel");
  const deepIndex = resultSection.indexOf("deepReading");
  const cardsIndex = resultSection.indexOf("resultCards");
  const guidanceIndex = resultSection.indexOf("quickGuidance");

  assert.ok(introIndex >= 0 && followUpIndex > introIndex, "follow-up should come after primary Vela speech");
  assert.ok(deepIndex > followUpIndex, "full analysis should come after the conversational surface");
  assert.ok(cardsIndex > deepIndex, "card-by-card analysis should stay inside deep reading");
  assert.ok(guidanceIndex > deepIndex, "structured guidance should stay inside deep reading");
});

test("follow-up context prefers the grounded analysis synthesis over the speech rendering", async () => {
  const source = await readFile(flowPath, "utf8");
  const compactStart = source.indexOf("function compactInitialReading");
  const compactEnd = source.indexOf("function cardSignature");
  const compact = source.slice(compactStart, compactEnd);

  assert.match(compact, /analysisSynthesis \|\| result\?\.synthesis/u);
  assert.match(compact, /overview: analysis\.overview/u);
  assert.match(compact, /narrative: analysis\.narrative/u);
});

test("Phase 4 keeps result typography intentionally below the original oversized treatment", async () => {
  const css = await readFile(cssPath, "utf8");

  assert.match(css, /\.resultIntro h2 \{[^}]*clamp\(1\.65rem,2\.4vw,2\.25rem\)/u);
  assert.match(css, /\.deepReading > summary/u);
  assert.match(css, /@media \(max-width: 760px\)/u);
});
