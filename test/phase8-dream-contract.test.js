import test from "node:test";
import assert from "node:assert/strict";
import { evidenceForDreamExtraction, normalizeDreamRequest, normalizeDreamOutput, dreamReadingId } from "../lib/dream-reading.js";
import { DREAM_BOOKS, DREAM_SOURCE_METHOD } from "../lib/dream-source-corpus.js";

test("Phase 8 dream sources expose verified provenance and Freud-first source mode", () => {
  assert.equal(DREAM_BOOKS.freud.sourceUrl, "https://www.gutenberg.org/ebooks/66048");
  assert.equal(DREAM_BOOKS.jung.sourceUrl, "https://www.gutenberg.org/ebooks/65903");
  assert.equal(DREAM_SOURCE_METHOD.primaryBookId, DREAM_BOOKS.freud.id);
  assert.equal(DREAM_SOURCE_METHOD.mode, "curated-public-domain-principles");
});

test("a single remembered dream image is enough to start a reading", () => {
  const input = normalizeDreamRequest({ dreamText: "我夢到蛇", wakingLifeContext: "", requestId: "dream-test-1234" });
  assert.equal(input.dreamText, "我夢到蛇");
  assert.equal(dreamReadingId(input), dreamReadingId(input));
  assert.throws(() => normalizeDreamRequest({ dreamText: "夢", requestId: "dream-test-1234" }), /至少告訴我一個/u);
});

test("default theme selection stays Freud-first while keeping source boundaries", () => {
  const evidence = evidenceForDreamExtraction({ themes: ["travel"], emotions: ["焦急"] });
  const ids = evidence.map((item) => item.id);
  assert.ok(ids.includes("personal-associations"));
  assert.ok(ids.includes("manifest-latent"));
  assert.ok(ids.includes("day-residue"));
  assert.ok(ids.includes("displacement"));
  assert.ok(evidence.every((item) => item.sourceId === DREAM_BOOKS.freud.id));
});

test("dream output accepts concise optional reflection while rejecting invented evidence", () => {
  const output = normalizeDreamOutput({
    overview: "這個夢反覆圍繞錯過與焦急。",
    whatStandsOut: ["一直趕路"],
    hypotheses: [
      { title: "近期壓力", interpretation: "可能吸收了最近等待結果的焦急。", evidenceIds: ["day-residue"] },
      { title: "多件事疊在一起", interpretation: "場景切換也可能把不同時期的壓力濃縮在一起。", evidenceIds: ["condensation"] },
    ],
    wakingLifeConnection: "如果最近剛好有等待或怕錯過的感受，這個夢可能和那種節奏有關。",
    reflectionQuestions: [],
    groundingNote: "先把它當成一份情緒線索，不必急著定義。",
    basisNote: "主要參考 Freud 的近期生活素材與濃縮原則。",
  }, ["day-residue", "condensation"]);
  assert.equal(output.hypotheses.length, 2);
  assert.equal(output.reflectionQuestions.length, 0);
  assert.throws(() => normalizeDreamOutput({
    overview: "x", whatStandsOut: ["a"],
    hypotheses: [
      { title: "a", interpretation: "b", evidenceIds: ["invented"] },
      { title: "c", interpretation: "d", evidenceIds: ["invented"] },
    ],
    wakingLifeConnection: "x", reflectionQuestions: [], groundingNote: "x", basisNote: "x",
  }, ["day-residue"]));
});
