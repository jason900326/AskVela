import assert from "node:assert/strict";
import test from "node:test";
import { buildDreamEvidence } from "../lib/dream-evidence.js";
import { extractDreamFeatures } from "../lib/dream-extractor.js";
import { dreamReadingId, normalizeDreamOutput, normalizeDreamRequest } from "../lib/dream-reading.js";

test("dream request validation and id are deterministic", () => {
  const request = normalizeDreamRequest({ dreamText: "我夢到在車站找不到火車，覺得非常焦急。", contextText: "最近在考慮換工作。", requestId: "dream-test-1234" });
  assert.equal(dreamReadingId(request), dreamReadingId(request));
  assert.throws(() => normalizeDreamRequest({ dreamText: "太短", requestId: "dream-test-1234" }), /多描述一點/);
});

test("dream evidence always uses both reviewed historical sources", () => {
  const evidence = buildDreamEvidence(extractDreamFeatures("我夢到過世的家人，醒來很難過。"));
  assert.equal(evidence.sufficient, true);
  assert.ok(evidence.items.some((item) => item.sourceId === "freud-interpretation-dreams-1913"));
  assert.ok(evidence.items.some((item) => item.sourceId === "ellis-world-of-dreams-1922"));
});

test("dream output rejects evidence ids the server did not provide", () => {
  const payload = {
    title: "找不到月台的夢",
    dreamSummary: "你在車站找月台。",
    emotionalThread: "焦急。",
    sourceObservations: [{ evidenceId: "fake", observation: "假的來源" }, { evidenceId: "ellis-emotion", observation: "情緒是重要線索" }],
    interpretation: "可能和近期的不確定感有關。",
    possibleConnections: ["選擇壓力", "時間壓力"],
    reflectionQuestions: ["最近哪個選擇讓你最急？", "你真正怕錯過的是什麼？"],
    nextStep: "寫下最擔心錯過的一件事。",
    basisNote: "從情緒與來源原則整理。"
  };
  assert.throws(() => normalizeDreamOutput(payload, new Set(["ellis-emotion", "freud-manifest-latent"])), /未提供/);
});
