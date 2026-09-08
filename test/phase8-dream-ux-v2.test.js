import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const dreamFlowPath = new URL("../components/DreamReadingFlow.js", import.meta.url);
const resumePath = new URL("../components/PendingAuthResume.js", import.meta.url);
const layoutPath = new URL("../app/layout.js", import.meta.url);
const polishPath = new URL("../app/phase8-polish.css", import.meta.url);
const sourcePath = new URL("../lib/dream-source-corpus.js", import.meta.url);

test("Dream starts from one remembered image instead of demanding a full intake", async () => {
  const flow = await readFile(dreamFlowPath, "utf8");
  assert.match(flow, /一句也可以/u);
  assert.match(flow, /我夢到蛇/u);
  assert.match(flow, /先說你最記得的畫面就好/u);
  assert.doesNotMatch(flow, /dreamText\.trim\(\)\.length < 8/u);
  assert.match(flow, /dreamOptionalDetails/u);
  assert.match(flow, /最近的生活背景（可選）/u);
});

test("Dream result prioritizes meaning and mindset while secondary material is collapsed", async () => {
  const flow = await readFile(dreamFlowPath, "utf8");
  assert.match(flow, /這個夢可能在反映/u);
  assert.match(flow, /最近的心態線索/u);
  assert.match(flow, /<details className="dreamDetails">/u);
  assert.match(flow, /如果你想再往下想一點（可選）/u);
  assert.match(flow, /解讀依據 · Freud 為主/u);
  assert.doesNotMatch(flow, /這次解讀用了哪些依據/u);
});

test("a completed anonymous Dream survives Google OAuth and resumes for account saving", async () => {
  const [flow, resume, layout] = await Promise.all([
    readFile(dreamFlowPath, "utf8"),
    readFile(resumePath, "utf8"),
    readFile(layoutPath, "utf8"),
  ]);
  assert.match(flow, /PENDING_AUTH_KEY/u);
  assert.match(flow, /\.googleAuthButton/u);
  assert.match(flow, /sessionStorage\.setItem\(SESSION_KEY/u);
  assert.match(flow, /sessionStorage\.setItem\(PENDING_AUTH_KEY, "dream"\)/u);
  assert.match(resume, /CustomEvent\("vela:experience", \{ detail: pending \}\)/u);
  assert.match(layout, /<PendingAuthResume \/>/u);
});

test("Dream entry headline is compact on mobile", async () => {
  const css = await readFile(polishPath, "utf8");
  assert.match(css, /\.dreamIntroHero h1\s*\{[^}]*font-size:\s*clamp\(1\.75rem/isu);
  assert.match(css, /@media \(max-width: 720px\)[\s\S]*\.dreamIntroHero h1\s*\{[^}]*font-size:\s*1\.7rem/isu);
});

test("runtime source contract explicitly identifies curated Freud-first principles", async () => {
  const source = await readFile(sourcePath, "utf8");
  assert.match(source, /mode: "curated-public-domain-principles"/u);
  assert.match(source, /primaryBookId: DREAM_BOOKS\.freud\.id/u);
  assert.match(source, /不是每次回答都對完整書籍做逐段 RAG 檢索/u);
  const themeBlock = source.slice(source.indexOf("export const DREAM_THEME_EVIDENCE"), source.indexOf("export const DREAM_SOURCE_GUARDRAILS"));
  assert.doesNotMatch(themeBlock, /symbolicMotif|compensation/u);
});
