import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const experiencePath = new URL("../components/VelaExperience.js", import.meta.url);
const accountPath = new URL("../components/VelaAccount.js", import.meta.url);
const brandPath = new URL("../components/VelaBrandLink.js", import.meta.url);
const polishPath = new URL("../app/phase8-polish.css", import.meta.url);

test("Vela home choices stay on the same awakened stage instead of extending the page with a modal", async () => {
  const experience = await readFile(experiencePath, "utf8");
  assert.match(experience, /entryMode !== "landing"/u);
  assert.match(experience, /velaHomeEntry/u);
  assert.match(experience, /velaJourneyPanel/u);
  assert.match(experience, /awakened=\{entryMode !== "landing"\}/u);
  assert.doesNotMatch(experience, /aria-modal="true"/u);
  assert.doesNotMatch(experience, /guideRecommendationOverlay/u);
});

test("the global Vela mark is the only top-level home navigation in mode flows", async () => {
  const [experience, brand] = await Promise.all([
    readFile(experiencePath, "utf8"),
    readFile(brandPath, "utf8"),
  ]);
  assert.doesNotMatch(experience, /← 回到 Vela/u);
  assert.match(brand, /<Link className="brandMark" href="\/"/u);
  assert.match(brand, /CustomEvent\("vela:experience", \{ detail: "home" \}\)/u);
});

test("Dream input and result surfaces stay dark and the result headline is compact", async () => {
  const css = await readFile(polishPath, "utf8");
  assert.match(css, /\.dreamHero\.compact h1\s*\{[^}]*font-size:\s*clamp\(1\.7rem/isu);
  assert.match(css, /\.dreamForm,[\s\S]*\.dreamResultCard,[\s\S]*background:\s*rgba\(15, 11, 21, \.86\)/u);
  assert.match(css, /\.dreamForm textarea\s*\{[^}]*background:\s*rgba\(5, 4, 8, \.62\)/isu);
  assert.match(css, /\.dreamHypotheses > article\s*\{[^}]*background:\s*rgba\(16, 12, 22, \.82\)/isu);
});

test("opening history first flushes an unsaved active Dream reading", async () => {
  const account = await readFile(accountPath, "utf8");
  const loadHistory = account.slice(account.indexOf("async function loadHistory"), account.indexOf("async function openHistoryItem"));
  assert.match(loadHistory, /if \(activeEntry\)/u);
  assert.match(loadHistory, /historyEndpoint\(activeEntry\.kind\)/u);
  assert.match(loadHistory, /method: "POST"/u);
  assert.ok(loadHistory.indexOf("method: \"POST\"") < loadHistory.indexOf("historyCollection(client, \"/api/dreams/history\")"));
});
