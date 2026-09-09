import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const flowPath = new URL("../components/TarotReadingFlowV4.js", import.meta.url);
const routePath = new URL("../app/api/readings/follow-up/route.js", import.meta.url);
const enginePath = new URL("../lib/reading-follow-up.js", import.meta.url);
const drawPath = new URL("../lib/tarot-draw.js", import.meta.url);
const pagePath = new URL("../app/page.js", import.meta.url);
const cssPath = new URL("../app/reading.css", import.meta.url);

test("Phase 5 preserves the active reading and the user's card choices in browser session storage", async () => {
  const source = await readFile(flowPath, "utf8");

  assert.match(source, /sessionStorage\.getItem\(READING_SESSION_KEY\)/u);
  assert.match(source, /sessionStorage\.setItem\(READING_SESSION_KEY/u);
  assert.match(source, /sessionStorage\.removeItem\(READING_SESSION_KEY\)/u);
  assert.match(source, /selectedCardIndexes/u);
  assert.match(source, /version: 2/u);
  assert.match(source, /setStage\("result"\)/u);
});

test("immersive Tarot V4 uses a real face-down selection and ordered reveal stage", async () => {
  const [source, page, draw] = await Promise.all([
    readFile(flowPath, "utf8"),
    readFile(pagePath, "utf8"),
    readFile(drawPath, "utf8"),
  ]);

  assert.match(source, /stage === "question"/u);
  assert.match(source, /stage === "select"/u);
  assert.match(source, /finalTarotSelectionStage/u);
  assert.match(source, /selectedCardIndexes/u);
  assert.match(source, /開始選牌/u);
  assert.match(source, /翻開你選的牌/u);
  assert.match(source, /依序翻開你選的牌/u);
  assert.doesNotMatch(page, /trustGrid/u);
  assert.match(draw, /selectedCardIndexes/u);
  assert.match(draw, /deck\[deckIndex\]/u);
  assert.match(draw, /shuffleFingerprint/u);
});

test("three-card reveal stays in one mobile row and keeps orientation badges visible", async () => {
  const css = await readFile(cssPath, "utf8");

  assert.match(css, /\.cardSpread\.cards-3 \{[^}]*grid-template-columns: repeat\(3,minmax\(0,1fr\)\)/u);
  assert.match(css, /\.tarotCardFront em \{[^}]*position: absolute/u);
  assert.match(css, /\.tarotCardFront em \{[^}]*bottom: 11px/u);
});

test("Phase 5 continuation stays with the same reading without messenger-style user/Vela bubbles", async () => {
  const source = await readFile(flowPath, "utf8");

  assert.match(source, /\/api\/readings\/follow-up/u);
  assert.match(source, /還想沿著這組牌問一件事？/u);
  assert.match(source, /followUps/u);
  assert.match(source, /繼續問 Vela/u);
  assert.doesNotMatch(source, /className="followUpUser"/u);
  assert.match(source, /開始新的占卜/u);
  assert.match(source, /MAX_FOLLOW_UP_MESSAGE_LENGTH = 320/u);
  assert.match(source, /MAX_FOLLOW_UPS = 6/u);
});

test("Phase 5 follow-up API rebuilds the original draw instead of accepting client-supplied cards", async () => {
  const [route, engine] = await Promise.all([
    readFile(routePath, "utf8"),
    readFile(enginePath, "utf8"),
  ]);

  assert.match(route, /answerReadingFollowUp/u);
  assert.match(engine, /createTarotDraw/u);
  assert.match(engine, /selectedCardIndexes: input\.selectedCardIndexes/u);
  assert.match(engine, /draw\.readingId !== input\.readingId/u);
  assert.match(engine, /retrieveReadingEvidence\(draw/u);
  assert.doesNotMatch(engine, /body\.cards/u);
  assert.match(engine, /maxHistoryExchangesForModel: 4/u);
  assert.match(engine, /maxOutputTokens: 650/u);
});
