import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const casesPath = new URL("../eval/vela-voice-cases.json", import.meta.url);
const runnerPath = new URL("../scripts/eval-vela-voice.js", import.meta.url);
const packagePath = new URL("../package.json", import.meta.url);
const gitignorePath = new URL("../.gitignore", import.meta.url);

test("Vela voice baseline contains four stable cases for each launch mode", async () => {
  const cases = JSON.parse(await readFile(casesPath, "utf8"));
  assert.equal(cases.length, 12);

  const counts = cases.reduce((map, item) => {
    map.set(item.mode, (map.get(item.mode) || 0) + 1);
    return map;
  }, new Map());

  assert.equal(counts.get("tarot"), 4);
  assert.equal(counts.get("astrology"), 4);
  assert.equal(counts.get("dream"), 4);
  assert.equal(new Set(cases.map((item) => item.id)).size, cases.length);

  for (const item of cases) {
    assert.ok(Array.isArray(item.reviewFocus) && item.reviewFocus.length > 0, `${item.id} needs review focus`);
    assert.ok(item.input?.requestId?.startsWith("voice-eval-"), `${item.id} needs a stable voice-eval request ID`);
  }

  for (const item of cases.filter((entry) => entry.mode === "tarot")) {
    assert.ok(Array.isArray(item.input.selectedCardIndexes), `${item.id} must freeze Tarot card selection`);
    assert.equal(item.input.selectedCardIndexes.length, item.input.spreadId === "single-guidance" ? 1 : 3);
  }

  for (const item of cases.filter((entry) => entry.mode === "astrology")) {
    assert.equal(item.input.localDate, "2026-09-08", `${item.id} must freeze Astrology date for comparison`);
    assert.equal(item.input.timezone, "Asia/Taipei");
  }
});

test("voice runner exercises all three real engines and judges only primary shared speech", async () => {
  const runner = await readFile(runnerPath, "utf8");
  assert.match(runner, /interpretTarotReading/u);
  assert.match(runner, /createAstrologyReading/u);
  assert.match(runner, /createDreamReading/u);
  assert.match(runner, /selected\.slice/u);
  assert.match(runner, /reading\?\.velaSpeech\?\.overview/u);
  assert.match(runner, /reading\.velaSpeech\.narrative/u);
  assert.match(runner, /legacyPresentation/u);
  assert.match(runner, /speechRendererStatus/u);
  assert.match(runner, /Speech renderer/u);
  assert.match(runner, /Speech attempts/u);
  assert.match(runner, /This worksheet judges only each mode's primary Vela Speech layer/u);
  assert.match(runner, /reportFiller/u);
  assert.match(runner, /polishedContrast/u);
  assert.match(runner, /不是\[\^。！？\\n\]/u);
  assert.match(runner, /真正\(\?:的\)\?/u);
  assert.match(runner, /deterministic/u);
  assert.match(runner, /deterministicMatches/u);
  assert.match(runner, /不代表\|不等於/u);
  assert.doesNotMatch(runner, /對方就是\|你就是/u);
  assert.match(runner, /theatricalMysticism/u);
  assert.match(runner, /SPOKEN_TEXTURE_PATTERN/u);
  assert.match(runner, /spokenTextureCount/u);
  assert.match(runner, /shortSpokenSentenceCount/u);
  assert.match(runner, /zero is not automatically bad/u);
  assert.match(runner, /Human review/u);
  assert.match(runner, /Do not treat automatic flags as the final verdict/u);
  assert.doesNotMatch(runner, /overallScore|finalScore|weightedScore/u);
});

test("voice evaluation is runnable from npm and generated results stay out of Git", async () => {
  const [packageJson, gitignore] = await Promise.all([
    readFile(packagePath, "utf8"),
    readFile(gitignorePath, "utf8"),
  ]);
  assert.match(packageJson, /"eval:voice"\s*:\s*"node --env-file=\.env\.local scripts\/eval-vela-voice\.js"/u);
  assert.match(gitignore, /eval\/results\//u);
});
