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
  assert.match(buildLayerCInstructions(safety), /Synthesize the cards/u);
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

test("Vela voice instructions prefer spoken Tarot prose over report-like or slogan-like output", () => {
  const safety = { isHighStakes: false, categories: [] };
  const layerB = buildLayerBInstructions(safety);
  const layerC = buildLayerCInstructions(safety);

  assert.match(layerB, /1-2 sentences/u);
  assert.match(layerB, /not like a formal report or textbook/u);
  assert.match(layerB, /same sentence rhythm/u);
  assert.match(layerC, /voice users experience as Vela/u);
  assert.match(layerC, /14-36 Traditional Chinese characters/u);
  assert.match(layerC, /not a polished headline, slogan, or clever antithesis/u);
  assert.match(layerC, /120-260 Traditional Chinese characters/u);
  assert.match(layerC, /one sentence can be very short/u);
  assert.match(layerC, /at most 2 focused items/u);
  assert.match(layerC, /at most 1 focused question/u);
  assert.match(layerC, /這組牌顯示/u);
});
