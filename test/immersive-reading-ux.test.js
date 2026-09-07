import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const flowPath = new URL("../components/TarotReadingFlow.js", import.meta.url);
const immersiveCssPath = new URL("../app/immersive-reading.css", import.meta.url);
const pagePath = new URL("../app/page.js", import.meta.url);

test("the landing explanation disappears once the reading begins", async () => {
  const source = await readFile(flowPath, "utf8");
  const page = await readFile(pagePath, "utf8");

  assert.match(source, /stage === "welcome"[\s\S]*className="velaHeader"/u);
  assert.match(source, /stage === "welcome"[\s\S]*className="trustGrid"/u);
  assert.doesNotMatch(page, /trustGrid/u);
});

test("users choose card backs before the draw API fixes the reading", async () => {
  const source = await readFile(flowPath, "utf8");

  assert.match(source, /DISPLAYED_CARD_BACKS/u);
  assert.match(source, /SelectionCard/u);
  assert.match(source, /selectedIndices/u);
  assert.match(source, /body: JSON\.stringify\(\{[\s\S]*selectedIndices/u);
  assert.match(source, /憑直覺選/u);
});

test("three revealed cards stay in one row and orientation remains visible on mobile", async () => {
  const css = await readFile(immersiveCssPath, "utf8");

  assert.match(css, /\.cardSpread\.cards-3 \{[\s\S]*grid-template-columns: repeat\(3/u);
  assert.match(css, /\.cardSpread\.cards-3 \.tarotCardFront em \{[\s\S]*min-height/u);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*\.cardSpread\.cards-3/u);
});

test("follow-up reading uses a continuous editorial flow instead of chat bubbles", async () => {
  const source = await readFile(flowPath, "utf8");
  const css = await readFile(immersiveCssPath, "utf8");

  assert.match(source, /className="followUpEntry"/u);
  assert.match(source, /className="followUpAnswer"/u);
  assert.doesNotMatch(source, /className="followUpUser"/u);
  assert.match(css, /\.followUpEntry/u);
});
