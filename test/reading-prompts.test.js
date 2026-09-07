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
  assert.match(buildLayerCInstructions(safety), /Do not merely repeat/u);
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

