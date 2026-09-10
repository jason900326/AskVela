import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const experiencePath = new URL("../components/VelaExperience.js", import.meta.url);
const entryPath = new URL("../components/VelaPlusQuestionEntry.js", import.meta.url);
const helpPath = new URL("../components/VelaQuestionHelp.js", import.meta.url);
const deepPath = new URL("../components/VelaDeepReadingIntro.js", import.meta.url);
const layoutPath = new URL("../app/layout.js", import.meta.url);

test("signed-in Vela+ entitlement still comes only from app_metadata", async () => {
  const experience = await readFile(experiencePath, "utf8");

  assert.match(experience, /getSupabaseBrowser/u);
  assert.match(experience, /user\?\.app_metadata/u);
  assert.match(experience, /askvela_plan === "vela_plus"/u);
  assert.match(experience, /askvela_plan_status === "active"/u);
  assert.doesNotMatch(experience, /user_metadata/u);
});

test("Free and Vela+ share the same free-form home question entry", async () => {
  const [experience, entry] = await Promise.all([
    readFile(experiencePath, "utf8"),
    readFile(entryPath, "utf8"),
  ]);

  assert.match(experience, /<VelaPlusQuestionEntry/u);
  assert.match(experience, /onReady=\{handleHomeQuestionReady\}/u);
  assert.match(entry, /<textarea/u);
  assert.match(entry, /maxLength=\{700\}/u);
  assert.match(entry, /免費一張 · 約 60 秒 · 不需註冊/u);
  assert.match(entry, /\/api\/deep-reading\/intake/u);
  assert.match(entry, /body: JSON\.stringify\(\{ question: text \}\)/u);
  assert.match(entry, /onReady\?\.\(\{ question: text, plan \}\)/u);
  assert.match(entry, /讓 Vela 先聽懂/u);
});

test("the help route is a separate page and guided buttons skip textarea refill", async () => {
  const [experience, entry, help] = await Promise.all([
    readFile(experiencePath, "utf8"),
    readFile(entryPath, "utf8"),
    readFile(helpPath, "utf8"),
  ]);

  assert.match(entry, /我不知道怎麼說/u);
  assert.match(experience, /pageKey="home-help"/u);
  assert.match(help, /onClick=\{\(\) => choose\(item\.question\)\}/u);
  assert.match(help, /body: JSON\.stringify\(\{ question \}\)/u);
  assert.doesNotMatch(help, /setQuestion/u);
  assert.doesNotMatch(help, /<textarea/u);
});

test("Vela+ uses the same intake result and then enters Deep Reading clarification", async () => {
  const [experience, deep] = await Promise.all([
    readFile(experiencePath, "utf8"),
    readFile(deepPath, "utf8"),
  ]);

  assert.match(experience, /if \(isVelaPlus && planReady\)[\s\S]*startDeepReading\(normalizedSeed\)/u);
  assert.match(experience, /initialQuestion=\{deepSeed\?\.question \|\| ""\}/u);
  assert.match(experience, /initialPlan=\{deepSeed\?\.plan \|\| null\}/u);
  assert.match(deep, /initialQuestion = "", initialPlan = null/u);
  assert.match(deep, /initialPlan \? "clarify" : "intake"/u);
  assert.match(deep, /String\(initialQuestion \|\| ""\)\.slice\(0, 700\)/u);
  assert.match(deep, /useState\(\(\) => initialPlan \|\| null\)/u);
});

test("Free users get the dynamic clarification before the one-card flow", async () => {
  const experience = await readFile(experiencePath, "utf8");

  assert.match(experience, /homeSeed\.plan\.velaLine/u);
  assert.match(experience, /homeSeed\.plan\.clarifyingQuestion/u);
  assert.match(experience, /homeSeed\.plan\.options\.map/u);
  assert.match(experience, /startQuick\(option\.focusQuestion, seed\)/u);
  assert.match(experience, /這一張會完整回答，不會做到一半才鎖結果/u);
});

test("Vela+ home styles are loaded after the Phase 12A motion and reading layers", async () => {
  const layout = await readFile(layoutPath, "utf8");
  const deepIndex = layout.indexOf('import "./phase12a-deep-reading.css"');
  const plusIndex = layout.indexOf('import "./phase12a-vela-plus-home.css"');

  assert.ok(deepIndex >= 0);
  assert.ok(plusIndex > deepIndex);
});
