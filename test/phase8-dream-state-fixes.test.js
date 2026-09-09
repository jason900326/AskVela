import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import test from "node:test";
import { recommendExperience } from "../lib/vela-experience-router.js";

const experiencePath = new URL("../components/VelaExperience.js", import.meta.url);
const dreamFlowPath = new URL("../components/DreamReadingFlowV2.js", import.meta.url);

test("natural dream phrasing routes to Dream instead of Tarot", () => {
  assert.equal(recommendExperience("我做了怪夢").mode, "dream");
  assert.equal(recommendExperience("我夢到蛇").mode, "dream");
  assert.equal(recommendExperience("昨晚做了一個很奇怪的夢").mode, "dream");
  assert.equal(recommendExperience("最近要不要換工作").mode, "tarot");
});

test("a new Dream handoff discards the previous Dream session before entering the flow", async () => {
  const experience = await readFile(experiencePath, "utf8");
  const beginDream = experience.slice(experience.indexOf("function beginDream"), experience.indexOf("function startDeepReading"));
  assert.match(beginDream, /sessionStorage\.removeItem\(DREAM_SESSION_KEY\)/u);
  assert.match(beginDream, /setDreamHandoffText\(nextDream\)/u);
});

test("Dream V2 never restores an older reading over a fresh handoff", async () => {
  const flow = await readFile(dreamFlowPath, "utf8");
  const restoreEffectStart = flow.indexOf("useEffect(() => {");
  const restoreEffectEnd = flow.indexOf("useEffect(() => {", restoreEffectStart + 1);
  const restoreEffect = flow.slice(restoreEffectStart, restoreEffectEnd);
  assert.match(restoreEffect, /String\(initialDream \|\| ""\)\.trim\(\)/u);
  assert.match(restoreEffect, /sessionStorage\.removeItem\(SESSION_KEY\)/u);
  assert.match(restoreEffect, /return undefined/u);
  assert.ok(restoreEffect.indexOf("initialDream") < restoreEffect.indexOf("sessionStorage.getItem(SESSION_KEY)"));
});

test("returning to Vela clears the previous Tarot-first home and Dream handoff state", async () => {
  const experience = await readFile(experiencePath, "utf8");
  const changeExperience = experience.slice(experience.indexOf("const changeExperience"), experience.indexOf("useEffect(() => {"));
  assert.match(changeExperience, /if \(next === "home"\)/u);
  assert.match(changeExperience, /setEntryMode\("landing"\)/u);
  assert.match(changeExperience, /setQuickQuestion\(""\)/u);
  assert.match(changeExperience, /setDreamHandoffText\(""\)/u);
  assert.match(changeExperience, /scrollTo/u);
});
