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
  assert.match(rules, /Freud 是目前預設/u);
});

test("Dream prompt is Freud-first, concise, and does not turn short dreams into an intake form", () => {
  const instructions = buildDreamInstructions();
  assert.match(instructions, /Freud 是目前主要歷史框架/u);
  assert.match(instructions, /即使 dreamText 很短/u);
  assert.match(instructions, /不要要求使用者先補齊人物、時間、地點/u);
  assert.match(instructions, /hypotheses 以 2 個為主/u);
  assert.match(instructions, /reflectionQuestions 是完全可選/u);
  assert.match(instructions, /wakingLifeContext 若為空/u);
  assert.match(instructions, /不要說「你沒有提供 wakingLifeContext」/u);
  assert.match(instructions, /不能編造具體事件/u);
});
