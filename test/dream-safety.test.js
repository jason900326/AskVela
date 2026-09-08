import test from "node:test";
import assert from "node:assert/strict";
import { buildDreamInstructions } from "../lib/dream-prompts.js";
import { DREAM_SOURCE_GUARDRAILS } from "../lib/dream-source-corpus.js";

test("Dream guardrails reject diagnostic and predictive certainty", () => {
  const rules = DREAM_SOURCE_GUARDRAILS.join("\n");
  assert.match(rules, /不要宣稱夢證明.*疾病/u);
  assert.match(rules, /未來事件/u);
  assert.match(rules, /超自然訊息/u);
  assert.match(rules, /個人聯想與現實脈絡優先/u);
});

test("Dream prompt requires hypotheses and uncertainty rather than a fixed symbol dictionary", () => {
  const instructions = buildDreamInstructions();
  assert.match(instructions, /不要把象徵當成固定答案/u);
  assert.match(instructions, /2–4 個可以同時成立的解讀假說/u);
  assert.match(instructions, /可能.*也許.*值得留意/u);
  assert.match(instructions, /wakingLifeContext 若為空/u);
});
