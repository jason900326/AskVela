import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const paths = {
  speech: new URL("../lib/vela-speech.js", import.meta.url),
  tarot: new URL("../lib/reading-interpreter.js", import.meta.url),
  astrology: new URL("../lib/astrology-reading.js", import.meta.url),
  dream: new URL("../lib/dream-reading.js", import.meta.url),
  astrologyFlow: new URL("../components/AstrologyReadingFlow.js", import.meta.url),
  dreamFlow: new URL("../components/DreamReadingFlow.js", import.meta.url),
  astrologyHistory: new URL("../lib/astrology-history.js", import.meta.url),
  dreamHistory: new URL("../lib/dream-history.js", import.meta.url),
};

test("Tarot, Astrology, and Dream all use the same Vela speech renderer", async () => {
  const [speech, tarot, astrology, dream] = await Promise.all([
    readFile(paths.speech, "utf8"),
    readFile(paths.tarot, "utf8"),
    readFile(paths.astrology, "utf8"),
    readFile(paths.dream, "utf8"),
  ]);

  assert.match(speech, /export async function renderVelaSpeech/u);
  assert.match(speech, /tarot:/u);
  assert.match(speech, /astrology:/u);
  assert.match(speech, /dream:/u);
  assert.match(speech, /high-stakes-directive/u);
  assert.match(speech, /for \(let attempt = 1; attempt <= 2/u);
  assert.match(tarot, /renderVelaSpeech/u);
  assert.match(tarot, /mode: "tarot"/u);
  assert.match(astrology, /renderVelaSpeech/u);
  assert.match(astrology, /mode: "astrology"/u);
  assert.match(dream, /renderVelaSpeech/u);
  assert.match(dream, /mode: "dream"/u);
});

test("Astrology and Dream keep primary speech separate from deep grounded analysis in UI", async () => {
  const [astrologyFlow, dreamFlow] = await Promise.all([
    readFile(paths.astrologyFlow, "utf8"),
    readFile(paths.dreamFlow, "utf8"),
  ]);

  assert.match(astrologyFlow, /reading\?\.velaSpeech\?\.overview/u);
  assert.match(astrologyFlow, /reading\?\.velaSpeech\?\.narrative/u);
  assert.match(astrologyFlow, /查看完整星座分析/u);
  assert.ok(astrologyFlow.indexOf("speechOverview") < astrologyFlow.indexOf("查看完整星座分析"));
  assert.match(dreamFlow, /reading\?\.velaSpeech\?\.overview/u);
  assert.match(dreamFlow, /reading\?\.velaSpeech\?\.narrative/u);
  assert.match(dreamFlow, /查看完整夢境分析/u);
  assert.ok(dreamFlow.indexOf("speechOverview") < dreamFlow.indexOf("查看完整夢境分析"));
});

test("Astrology and Dream speech survive history without a database migration", async () => {
  const [astrologyHistory, dreamHistory] = await Promise.all([
    readFile(paths.astrologyHistory, "utf8"),
    readFile(paths.dreamHistory, "utf8"),
  ]);
  assert.match(astrologyHistory, /_velaSpeech/u);
  assert.match(astrologyHistory, /speechRecordForStorage/u);
  assert.match(dreamHistory, /_velaSpeech/u);
  assert.match(dreamHistory, /speechRecordForStorage/u);
});
