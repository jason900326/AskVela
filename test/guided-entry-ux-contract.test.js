import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const experiencePath = new URL("../components/VelaExperience.js", import.meta.url);
const tarotPath = new URL("../components/TarotReadingFlowV4.js", import.meta.url);
const astrologyCssPath = new URL("../app/astrology.css", import.meta.url);

test("home supports users who cannot formulate a question yet", async () => {
  const experience = await readFile(experiencePath, "utf8");

  assert.match(experience, /我也說不上來/u);
  assert.match(experience, /不知道怎麼說也沒關係/u);
  assert.match(experience, /GUIDED_AREAS/u);
  assert.match(experience, /GUIDED_FEELINGS/u);
  assert.match(experience, /GUIDED_GOALS/u);
  assert.match(experience, /我連這個也不知道/u);
  assert.match(experience, /buildGuidedQuestion/u);
  assert.match(experience, /看看目前卡住我的可能是什麼，以及現在可以先留意什麼/u);
});

test("guided entry hands the generated question into the active Tarot flow instead of asking for it again from scratch", async () => {
  const [experience, tarot] = await Promise.all([
    readFile(experiencePath, "utf8"),
    readFile(tarotPath, "utf8"),
  ]);

  assert.match(experience, /tarotHandoffQuestion/u);
  assert.match(experience, /<TarotReadingFlowV4 initialQuestion=\{tarotHandoffQuestion\}/u);
  assert.match(tarot, /TarotReadingFlowV4\(\{ initialQuestion = "", onExperienceChange = null \}\)/u);
  assert.match(tarot, /const routedQuestion = String\(initialQuestion \|\| ""\)\.trim\(\)\.slice\(0, 500\)/u);
  assert.match(tarot, /useState\(routedQuestion\)/u);
  assert.match(tarot, /routedQuestion \? "routing" : "question"/u);
});

test("guided entry choices remain responsive and readable on mobile", async () => {
  const css = await readFile(astrologyCssPath, "utf8");

  assert.match(css, /\.velaEntryChoices\s*\{[^}]*grid-template-columns:\s*repeat\(2/su);
  assert.match(css, /\.guidedChoiceGrid\s*\{[^}]*grid-template-columns:\s*repeat\(3/su);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*\.velaEntryChoices\s*\{\s*grid-template-columns:\s*1fr;/u);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*\.guidedChoiceGrid\s*\{\s*grid-template-columns:\s*1fr;/u);
});
