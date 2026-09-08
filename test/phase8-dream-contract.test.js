import test from "node:test";
import assert from "node:assert/strict";
import { evidenceForDreamExtraction, normalizeDreamRequest, normalizeDreamOutput, dreamReadingId } from "../lib/dream-reading.js";
import { DREAM_BOOKS } from "../lib/dream-source-corpus.js";

test("Phase 8 dream sources expose verified provenance", () => {
  assert.equal(DREAM_BOOKS.freud.sourceUrl, "https://www.gutenberg.org/ebooks/66048");
  assert.equal(DREAM_BOOKS.jung.sourceUrl, "https://www.gutenberg.org/ebooks/65903");
});

test("dream request validates length and creates stable id", () => {
  const input = normalizeDreamRequest({ dreamText: "我夢到一直趕不上火車，最後回到高中教室。", wakingLifeContext: "最近在等工作結果。", requestId: "dream-test-1234" });
  assert.equal(dreamReadingId(input), dreamReadingId(input));
  assert.throws(() => normalizeDreamRequest({ dreamText: "太短", requestId: "dream-test-1234" }));
});

test("theme selection always keeps personal association and source boundary", () => {
  const evidence = evidenceForDreamExtraction({ themes: ["travel"], emotions: ["焦急"] });
  const ids = evidence.map((item) => item.id);
  assert.ok(ids.includes("personal-associations"));
  assert.ok(ids.includes("manifest-latent"));
  assert.ok(ids.includes("day-residue"));
  assert.ok(ids.includes("displacement"));
});

test("dream output rejects evidence ids not selected by server", () => {
  const output = normalizeDreamOutput({
    overview: "這個夢反覆圍繞錯過與焦急。",
    whatStandsOut: ["一直趕路", "場景突然變成學校"],
    hypotheses: [
      { title: "近期壓力", interpretation: "可能吸收了最近等待結果的焦急。", evidenceIds: ["day-residue"] },
      { title: "多件事疊在一起", interpretation: "場景切換也可能把不同時期的壓力濃縮在一起。", evidenceIds: ["condensation"] },
    ],
    wakingLifeConnection: "可以對照最近是否有等待或怕錯過機會的情境。",
    reflectionQuestions: ["最近最怕錯過什麼？", "高中教室對你本人有什麼聯想？"],
    groundingNote: "先把夢當成一份情緒線索，而不是預言。",
    basisNote: "使用近期生活素材與濃縮兩個歷史解夢原則。",
  }, ["day-residue", "condensation"]);
  assert.equal(output.hypotheses.length, 2);
  assert.throws(() => normalizeDreamOutput({
    overview: "x", whatStandsOut: ["a", "b"],
    hypotheses: [
      { title: "a", interpretation: "b", evidenceIds: ["invented"] },
      { title: "c", interpretation: "d", evidenceIds: ["invented"] },
    ],
    wakingLifeConnection: "x", reflectionQuestions: ["a", "b"], groundingNote: "x", basisNote: "x",
  }, ["day-residue"]));
});
