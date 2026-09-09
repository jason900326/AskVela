import assert from "node:assert/strict";
import test from "node:test";
import {
  buildLayerAInstructions,
  buildLayerBInstructions,
  buildLayerCInstructions,
} from "../lib/reading-prompts.js";

test("the three prompt layers keep source, context, and synthesis responsibilities separate", () => {
  const safety = { isHighStakes: false, categories: [] };
  assert.match(buildLayerAInstructions(), /Do not apply the card to the user's question/u);
  assert.match(buildLayerBInstructions(safety), /spread position/u);
  assert.match(buildLayerCInstructions(safety), /connect them into one overall movement/u);
  assert.match(buildLayerCInstructions(safety), /card-by-card walk-through/u);
});

test("high-stakes context is explicitly passed into context and synthesis layers", () => {
  const safety = { isHighStakes: true, categories: ["medical"] };
  assert.match(buildLayerBInstructions(safety), /medical/u);
  assert.match(buildLayerCInstructions(safety), /professional or emergency assistance/u);
});

test("all interpretation layers prohibit converting difficult source themes into person judgments", () => {
  const safety = { isHighStakes: false, categories: [] };
  assert.match(buildLayerAInstructions(), /stable moral judgment about a person/u);
  assert.match(buildLayerAInstructions(), /false consensus/u);
  assert.match(buildLayerBInstructions(safety), /Do not infer stable personality/u);
  assert.match(buildLayerBInstructions(safety), /possibility to examine/u);
  assert.match(buildLayerCInstructions(safety), /declare another person bad/u);
});

test("Vela interpretation instructions prefer grounded, card-visible prose over report-like or slogan-like output", () => {
  const safety = { isHighStakes: false, categories: [] };
  const layerB = buildLayerBInstructions(safety);
  const layerC = buildLayerCInstructions(safety);

  assert.match(layerB, /2-3 substantive sentences/u);
  assert.match(layerB, /Do not add fillers, fake hesitation/u);
  assert.match(layerB, /Do not make every card paragraph end with a polished conclusion/u);
  assert.match(layerC, /voice users experience as Vela/u);
  assert.match(layerC, /14-42 Traditional Chinese characters/u);
  assert.match(layerC, /polished slogan/u);
  assert.match(layerC, /220-420 Traditional Chinese characters/u);
  assert.match(layerC, /Shorter is better/u);
  assert.match(layerC, /up to 3 focused items/u);
  assert.match(layerC, /exactly 1 focused question/u);
  assert.match(layerC, /這組牌顯示/u);
});
