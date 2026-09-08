import test from "node:test";
import assert from "node:assert/strict";
import {
  dreamHistoryRowToSnapshot,
  dreamHistoryRowToSummary,
  normalizeDreamHistorySnapshot,
} from "../lib/dream-history.js";
import { dreamReadingId } from "../lib/dream-reading.js";

const velaSpeech = {
  version: "shared-speech-v2",
  status: "rendered",
  attempts: 1,
  fallbackFields: [],
  violations: [],
  safeFallback: false,
  overview: "我會先停在那個來不及的感覺。",
  narrative: "火車離開這個畫面可以先沿著等待感看，先不用急著替它定義一個固定意思。",
};

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
    velaSpeech,
    sourceGrounded: true,
    disclaimer: "反思用途。",
  };
}

test("dream history snapshot recomputes id and source evidence and stores speech metadata", () => {
  const normalized = normalizeDreamHistorySnapshot(sampleDream());
  assert.equal(normalized.kind, undefined);
  assert.match(normalized.readingId, /^dream_[0-9a-f]{32}$/u);
  assert.ok(normalized.sources.some((source) => source.id === "personal-associations"));
  assert.ok(normalized.sources.some((source) => source.id === "day-residue"));
  assert.equal(normalized.result._velaSpeech.overview, velaSpeech.overview);
});

test("dream history rejects a tampered reading id", () => {
  const snapshot = sampleDream();
  snapshot.readingId = "dream_00000000000000000000000000000000";
  assert.throws(() => normalizeDreamHistorySnapshot(snapshot), /不一致/u);
});

test("dream history summary prefers speech but remains compatible with old rows", () => {
  const dream = sampleDream();
  const rowBase = {
    id: dream.readingId,
    dream_text: dream.dreamText,
    extraction: dream.extraction,
    updated_at: "2026-09-08T00:00:00Z",
    expires_at: "2027-09-08T00:00:00Z",
  };
  const summary = dreamHistoryRowToSummary({
    ...rowBase,
    reading_result: { ...dream.result, _velaSpeech: velaSpeech },
  });
  const legacy = dreamHistoryRowToSummary({ ...rowBase, reading_result: dream.result });
  assert.equal(summary.kind, "dream");
  assert.equal(summary.title, "趕不上火車後回到高中教室");
  assert.equal(summary.themeCount, 2);
  assert.equal(summary.overview, velaSpeech.overview);
  assert.equal(legacy.overview, dream.result.overview);
});

test("dream history row restores stored speech separately from canonical analysis", () => {
  const normalized = normalizeDreamHistorySnapshot(sampleDream());
  const restored = dreamHistoryRowToSnapshot({
    id: normalized.readingId,
    request_id: normalized.requestId,
    dream_text: normalized.dreamText,
    waking_life_context: normalized.wakingLifeContext,
    extraction: normalized.extraction,
    reading_result: normalized.result,
    disclaimer: normalized.disclaimer,
  });
  assert.equal(restored.result.overview, sampleDream().result.overview);
  assert.equal(restored.result._velaSpeech, undefined);
  assert.equal(restored.velaSpeech.overview, velaSpeech.overview);
});
