import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const flowPath = new URL("../components/TarotReadingFlow.js", import.meta.url);
const routePath = new URL("../app/api/readings/follow-up/route.js", import.meta.url);
const enginePath = new URL("../lib/reading-follow-up.js", import.meta.url);

test("Phase 5 preserves the active reading in browser session storage", async () => {
  const source = await readFile(flowPath, "utf8");

  assert.match(source, /sessionStorage\.getItem\(READING_SESSION_KEY\)/u);
  assert.match(source, /sessionStorage\.setItem\(READING_SESSION_KEY/u);
  assert.match(source, /sessionStorage\.removeItem\(READING_SESSION_KEY\)/u);
  assert.match(source, /setStage\("result"\)/u);
});

test("Phase 5 follow-ups are clearly separate from starting a new reading", async () => {
  const source = await readFile(flowPath, "utf8");

  assert.match(source, /\/api\/readings\/follow-up/u);
  assert.match(source, /還有想從這組牌繼續問的嗎？/u);
  assert.match(source, /不會重新抽牌/u);
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
  assert.match(engine, /draw\.readingId !== input\.readingId/u);
  assert.match(engine, /retrieveReadingEvidence\(draw/u);
  assert.doesNotMatch(engine, /body\.cards/u);
  assert.match(engine, /maxHistoryExchangesForModel: 4/u);
  assert.match(engine, /maxOutputTokens: 650/u);
});
