import assert from "node:assert/strict";
import test from "node:test";
import { classifyHighStakesQuestion } from "../lib/tarot-safety.js";

test("ordinary reflective questions are not classified as high stakes", () => {
  assert.deepEqual(classifyHighStakesQuestion("我和朋友最近為什麼一直溝通不良？"), {
    isHighStakes: false,
    categories: [],
    notices: [],
  });
});

test("medical, legal, financial, and crisis categories can be detected together", () => {
  const result = classifyHighStakesQuestion("我生病又遇到官司，是否該賣出股票？我甚至不想活了。" );
  assert.equal(result.isHighStakes, true);
  assert.deepEqual(result.categories, ["medical", "legal", "financial", "crisis"]);
  assert.equal(result.notices.length, 4);
});

