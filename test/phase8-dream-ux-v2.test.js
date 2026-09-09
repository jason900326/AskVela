import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const dreamFlowPath = new URL("../components/DreamReadingFlowV2.js", import.meta.url);
const resumePath = new URL("../components/PendingAuthResume.js", import.meta.url);
const layoutPath = new URL("../app/layout.js", import.meta.url);
const polishPath = new URL("../app/phase8-polish.css", import.meta.url);
const sourcePath = new URL("../lib/dream-source-corpus.js", import.meta.url);

test("Dream V2 starts from one remembered image instead of demanding a full intake", async () => {
  const flow = await readFile(dreamFlowPath, "utf8");
  assert.match(flow, /昨晚夢到什麼？/u);
  assert.match(flow, /不用整理得很完整/u);
  assert.match(flow, /最記得的畫面、人物、聲音或感覺/u);
  assert.match(flow, /dreamText\.trim\(\)\.length < 2/u);
  assert.doesNotMatch(flow, /dreamText\.trim\(\)\.length < 8/u);
});

test("Dream V2 keeps the grounded result visible and moves secondary hypotheses and provenance into details", async () => {
  const flow = await readFile(dreamFlowPath, "utf8");
  assert.match(flow, /reading\?\.velaSpeech\?\.overview/u);
  assert.match(flow, /finalReadingArticle dreamFinalResult/u);
  assert.match(flow, /這個夢可能在反映/u);
  assert.match(flow, /最近的心境線索/u);
  assert.match(flow, /夢裡最值得留意的象徵/u);
  assert.match(flow, /VELA 想問你/u);
  assert.match(flow, /查看完整夢境解析與依據/u);
  assert.match(flow, /otherHypotheses\.map/u);
  assert.match(flow, /result\?\.basisNote/u);
  assert.ok(flow.indexOf("這個夢可能在反映") < flow.indexOf("查看完整夢境解析與依據"));
});

test("a completed anonymous Dream is persisted for the shared OAuth resume and account-saving layer", async () => {
  const [flow, resume, layout] = await Promise.all([
    readFile(dreamFlowPath, "utf8"),
    readFile(resumePath, "utf8"),
    readFile(layoutPath, "utf8"),
  ]);
  assert.match(flow, /sessionStorage\.setItem\(SESSION_KEY/u);
  assert.match(flow, /<VelaAccount experience="dream" activeDream=\{reading\}/u);
  assert.match(resume, /DREAM_SESSION_KEY = "askvela\.current-dream\.v1"/u);
  assert.match(resume, /pendingModeForPath/u);
  assert.match(resume, /pathname === "\/api\/dreams\/reading"/u);
  assert.match(resume, /persistCompletedAnalysis/u);
  assert.match(resume, /window\.sessionStorage\.setItem\(PENDING_AUTH_KEY, mode\)/u);
  assert.match(resume, /CustomEvent\("vela:experience", \{ detail: mode \}\)/u);
  assert.match(layout, /<PendingAuthResume \/>/u);
});

test("Dream entry headline is compact on mobile", async () => {
  const css = await readFile(polishPath, "utf8");
  assert.match(css, /\.dreamIntroHero h1\s*\{[^}]*font-size:\s*clamp\(1\.75rem/isu);
  assert.match(css, /@media \(max-width: 720px\)[\s\S]*\.dreamIntroHero h1\s*\{[^}]*font-size:\s*1\.7rem/isu);
});

test("runtime source contract prefers Freud full-book RAG and keeps an explicit curated fallback", async () => {
  const source = await readFile(sourcePath, "utf8");
  assert.match(source, /fullRagMode: "freud-full-book-rag"/u);
  assert.match(source, /fallbackMode: "curated-public-domain-principles"/u);
  assert.match(source, /primaryBookId: DREAM_BOOKS\.freud\.id/u);
  assert.match(source, /primaryBookSlug: DREAM_BOOKS\.freud\.slug/u);
  assert.match(source, /若 Freud 全文已完成向量索引/u);
  assert.match(source, /若索引尚未建立，才退回/u);
  const themeBlock = source.slice(source.indexOf("export const DREAM_THEME_EVIDENCE"), source.indexOf("export const DREAM_SOURCE_GUARDRAILS"));
  assert.doesNotMatch(themeBlock, /symbolicMotif|compensation/u);
});
