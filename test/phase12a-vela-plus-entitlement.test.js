import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const experiencePath = new URL("../components/VelaExperience.js", import.meta.url);
const entryPath = new URL("../components/VelaPlusQuestionEntry.js", import.meta.url);
const deepPath = new URL("../components/VelaDeepReadingIntro.js", import.meta.url);
const layoutPath = new URL("../app/layout.js", import.meta.url);

test("signed-in Vela+ entitlement comes from app_metadata and switches the home entry", async () => {
  const experience = await readFile(experiencePath, "utf8");

  assert.match(experience, /getSupabaseBrowser/u);
  assert.match(experience, /user\?\.app_metadata/u);
  assert.match(experience, /askvela_plan === "vela_plus"/u);
  assert.match(experience, /askvela_plan_status === "active"/u);
  assert.doesNotMatch(experience, /user_metadata/u);
  assert.match(experience, /isVelaPlus \? \(/u);
  assert.match(experience, /<VelaPlusQuestionEntry onReady=\{startDeepReading\}/u);
  assert.match(experience, /FREE_QUESTION_PRESETS\.map/u);
});

test("Vela+ home accepts a free-form issue and performs the small intake call before Deep Reading", async () => {
  const entry = await readFile(entryPath, "utf8");

  assert.match(entry, /<textarea/u);
  assert.match(entry, /maxLength=\{700\}/u);
  assert.match(entry, /\/api\/deep-reading\/intake/u);
  assert.match(entry, /body: JSON\.stringify\(\{ question: text \}\)/u);
  assert.match(entry, /onReady\?\.\(\{ question: text, plan \}\)/u);
  assert.match(entry, /讓 Vela 先聽懂/u);
});

test("a home-planned Vela+ issue enters Deep Reading at clarification without asking for the same text twice", async () => {
  const [experience, deep] = await Promise.all([
    readFile(experiencePath, "utf8"),
    readFile(deepPath, "utf8"),
  ]);

  assert.match(experience, /initialQuestion=\{deepSeed\?\.question \|\| ""\}/u);
  assert.match(experience, /initialPlan=\{deepSeed\?\.plan \|\| null\}/u);
  assert.match(deep, /initialQuestion = "", initialPlan = null/u);
  assert.match(deep, /initialPlan \? "clarify" : "intake"/u);
  assert.match(deep, /String\(initialQuestion \|\| ""\)\.slice\(0, 700\)/u);
  assert.match(deep, /useState\(\(\) => initialPlan \|\| null\)/u);
});

test("Vela+ home styles are loaded after the Phase 12A motion and reading layers", async () => {
  const layout = await readFile(layoutPath, "utf8");
  const deepIndex = layout.indexOf('import "./phase12a-deep-reading.css"');
  const plusIndex = layout.indexOf('import "./phase12a-vela-plus-home.css"');

  assert.ok(deepIndex >= 0);
  assert.ok(plusIndex > deepIndex);
});
