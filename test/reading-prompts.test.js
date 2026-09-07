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

