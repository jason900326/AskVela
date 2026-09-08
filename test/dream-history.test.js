import test from "node:test";
import assert from "node:assert/strict";
import { normalizeDreamHistorySnapshot, dreamHistoryRowToSummary } from "../lib/dream-history.js";
import { dreamReadingId } from "../lib/dream-reading.js";

function sampleDream() {
  const request = {
    dreamText: "我夢到一直趕不上火車，最後突然回到高中教室，心裡非常著急。",
    wakingLifeContext: "最近正在等一個重要結果。",
    requestId: "dream-history-1234",
  };
  return {
    kind: "dream",
    readingId: dreamReadingId(request),
    requestId: request.requestId,
    dreamText: request.dreamText,
    wakingLifeContext: request.wakingLifeContext,
    extraction: {
      people: [], places: ["火車站", "高中教室"], objects: ["火車"], actions: ["趕車"],
      emotions: ["著急"], themes: ["travel", "schoolWork"], notableImages: ["關上的車門"], summary: "趕不上火車後回到高中教室",
    },
    result: {
      overview: "這個夢反覆圍繞錯過與焦急。",
      whatStandsOut: ["一直趕路", "場景突然回到學校"],
      hypotheses: [
        { title: "近期生活素材", interpretation: "等待結果的焦急可能進入夢裡。", evidenceIds: ["day-residue"] },
        { title: "多個時期被疊在一起", interpretation: "工作與學生時期的壓力可能在夢裡同時出現。", evidenceIds: ["condensation"] },
      ],
      wakingLifeConnection: "可以對照最近是否有怕錯過機會的感受。",
      reflectionQuestions: ["最近最怕錯過什麼？", "高中教室對你本人代表什麼？"],
      groundingNote: "把夢當成情緒線索，而不是預言。",
      basisNote: "依據近期生活素材與濃縮的歷史解夢原則。",
    },
    sourceGrounded: true,
    disclaimer: "反思用途。",
  };
}

test("dream history snapshot recomputes id and source evidence", () => {
  const normalized = normalizeDreamHistorySnapshot(sampleDream());
  assert.equal(normalized.kind, undefined);
  assert.match(normalized.readingId, /^dream_[0-9a-f]{32}$/u);
  assert.ok(normalized.sources.some((source) => source.id === "personal-associations"));
  assert.ok(normalized.sources.some((source) => source.id === "day-residue"));
});

test("dream history rejects a tampered reading id", () => {
  const snapshot = sampleDream();
  snapshot.readingId = "dream_00000000000000000000000000000000";
  assert.throws(() => normalizeDreamHistorySnapshot(snapshot), /不一致/u);
});

test("dream history summary does not expose the full dream as primary UI text", () => {
  const summary = dreamHistoryRowToSummary({
    id: sampleDream().readingId,
    dream_text: sampleDream().dreamText,
    extraction: sampleDream().extraction,
    reading_result: sampleDream().result,
    updated_at: "2026-09-08T00:00:00Z",
    expires_at: "2027-09-08T00:00:00Z",
  });
  assert.equal(summary.kind, "dream");
  assert.equal(summary.title, "趕不上火車後回到高中教室");
  assert.equal(summary.themeCount, 2);
});
