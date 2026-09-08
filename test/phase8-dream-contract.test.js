import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const experience = fs.readFileSync(new URL("../components/VelaExperience.js", import.meta.url), "utf8");
const account = fs.readFileSync(new URL("../components/VelaAccount.js", import.meta.url), "utf8");
const prompt = fs.readFileSync(new URL("../lib/dream-prompts.js", import.meta.url), "utf8");
const migration = fs.readFileSync(new URL("../supabase/migrations/006_dream_history.sql", import.meta.url), "utf8");

test("Phase 8 wires Dream as a real experience", () => {
  assert.match(experience, /DreamReadingFlow/);
  assert.match(experience, /setExperience\("dream"\)/);
  assert.doesNotMatch(experience, /解夢資料庫準備中/);
});

test("Dream account history is private and unified", () => {
  assert.match(account, /\/api\/dreams\/history/);
  assert.match(account, /kind === "dream"/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /auth\.uid\(\) = user_id/);
});

test("Dream prompt forbids diagnosis and fixed symbol dictionary claims", () => {
  assert.match(prompt, /不是診斷/);
  assert.match(prompt, /固定符號字典/);
  assert.match(prompt, /不可從夢推斷精神疾病/);
  assert.match(prompt, /不可宣稱真的與亡者聯繫/);
});
