import assert from "node:assert/strict";
import test from "node:test";
import { buildDreamEvidence } from "../lib/dream-evidence.js";
import { extractDreamFeatures } from "../lib/dream-extractor.js";
import { dreamReadingId } from "../lib/dream-reading.js";
import { normalizeDreamHistorySnapshot } from "../lib/dream-history.js";

function snapshot() {
  const base = { dreamText: "我夢到在一間黑暗的房子裡找出口，覺得很緊張。", contextText: "最近事情很多。", requestId: "dream-history-1234" };
  const evidence = buildDreamEvidence(extractDreamFeatures(base.dreamText));
  return {
    kind: "dream",
    sourceGrounded: true,
    ...base,
    readingId: dreamReadingId(base),
    result: {
      title: "找出口",
      dreamSummary: "你在黑暗房子裡找出口。",
      emotionalThread: "緊張與尋找。",
      sourceObservations: evidence.items.slice(0, 2).map((item) => ({ evidenceId: item.id, observation: item.principle.slice(0, 80) })),
      interpretation: "這可以先被看成一個把壓力畫面化的夢。",
      possibleConnections: ["近期壓力", "想找到下一步"],
      reflectionQuestions: ["最近哪件事最像在找出口？", "哪個方向其實已經出現？"],
      nextStep: "先列出一個可以完成的小步驟。",
      basisNote: "依情緒與象徵原則整理。"
    },
    disclaimer: "reflection only"
  };
}

test("dream history recomputes extraction and canonical evidence", () => {
  const normalized = normalizeDreamHistorySnapshot(snapshot());
  assert.equal(normalized.sourceGrounded, true);
  assert.ok(normalized.extracted.tags.includes("darkness"));
  assert.ok(normalized.sources.references.length >= 2);
});

test("dream history rejects a mismatched reading id", () => {
  const value = snapshot();
  value.readingId = "dream_wrong";
  assert.throws(() => normalizeDreamHistorySnapshot(value), /不一致/);
});
