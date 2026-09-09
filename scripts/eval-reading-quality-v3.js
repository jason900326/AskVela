import { appendFile, readdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const RESULTS_DIR = resolve(ROOT, "eval/results");

const STYLE_PATTERNS = Object.freeze([
  {
    id: "contrast-not-but",
    label: "先否定再翻轉",
    pattern: /不是[^。！？\n]{0,52}(?:而是|只是|反而是|更像)/gu,
  },
  {
    id: "contrast-not-only",
    label: "不只是 A 再揭曉 B",
    pattern: /不只是[^。！？\n]{0,52}(?:而是|也(?:是|有|包含|要|會)?|還(?:是|有|要|會)?)/gu,
  },
  {
    id: "contrast-more-like",
    label: "不像 A、更像 B",
    pattern: /不像[^。！？\n]{0,52}(?:更像|反而像)/gu,
  },
  {
    id: "contrast-seems-actually",
    label: "看似 A、其實 B",
    pattern: /看似[^。！？\n]{0,52}(?:其實|實際上)/gu,
  },
  {
    id: "contrast-rather-than",
    label: "與其 A、不如 B",
    pattern: /與其[^。！？\n]{0,52}不如/gu,
  },
  {
    id: "reveal-summary",
    label: "揭曉式總結",
    pattern: /真正(?:的)?(?:重點|問題|需要|值得)|核心(?:在於|是|不在)|關鍵(?:在於|是|不在)/gu,
  },
  {
    id: "performed-thinking",
    label: "表演式思考",
    pattern: /嗯[………\.]{2,}|我想一下|怎麼說[………\.]*|我會先看這個|這裡有個地方我會多看一眼/gu,
  },
]);

const TRANSIENT_RUN_FAILURE = /JWT issued at future|fetch failed|ECONNRESET|ETIMEDOUT|network/i;
const KNOWN_FALSE_POSITIVE_OVERCLAIM = /^證明(?:他|她|對方)$/u;

function collectStrings(value) {
  if (typeof value === "string") return value.trim() ? [value.trim()] : [];
  if (Array.isArray(value)) return value.flatMap(collectStrings);
  if (!value || typeof value !== "object") return [];
  return Object.values(value).flatMap(collectStrings);
}

function styleWarnings(mainOutput) {
  const text = collectStrings(mainOutput).join("\n");
  const warnings = [];
  for (const rule of STYLE_PATTERNS) {
    const matches = [...text.matchAll(rule.pattern)].map((match) => match[0].trim());
    const unique = [...new Set(matches)];
    if (unique.length) warnings.push({ id: rule.id, label: rule.label, matches: unique });
  }
  return warnings;
}

function effectiveHardFailures(item) {
  if (!item?.ok) return [];
  const deterministic = item.deterministic || {};
  const sourceLeaks = Array.isArray(deterministic.sourceLeaks) ? deterministic.sourceLeaks : [];
  const systemLeaks = Array.isArray(deterministic.systemLeaks) ? deterministic.systemLeaks : [];
  const overclaims = (Array.isArray(deterministic.overclaims) ? deterministic.overclaims : [])
    .filter((claim) => !KNOWN_FALSE_POSITIVE_OVERCLAIM.test(String(claim || "").trim()));

  return [
    ...(sourceLeaks.length ? [`internal source names: ${sourceLeaks.join("、")}`] : []),
    ...(systemLeaks.length ? [`internal system terms: ${systemLeaks.join("、")}`] : []),
    ...(overclaims.length ? [`deterministic claims: ${overclaims.join("、")}`] : []),
  ];
}

async function newestResultJson() {
  const names = (await readdir(RESULTS_DIR)).filter((name) => /^reading-quality-.*\.json$/u.test(name));
  if (!names.length) throw new Error("Reading Quality 沒有產生 JSON 結果。");
  const entries = await Promise.all(names.map(async (name) => {
    const data = JSON.parse(await readFile(resolve(RESULTS_DIR, name), "utf8"));
    return { name, data, generatedAt: Date.parse(data.generatedAt || "") || 0 };
  }));
  entries.sort((a, b) => b.generatedAt - a.generatedAt);
  return entries[0];
}

await import("./eval-reading-quality.js");

const latest = await newestResultJson();
const rawResults = latest.data.results || [];
const cases = rawResults.map((item) => ({
  id: item.id,
  mode: item.mode,
  warnings: item.ok ? styleWarnings(item.mainOutput) : [],
}));
const flagged = cases.filter((item) => item.warnings.length);
const transientFailures = rawResults.filter((item) => !item.ok && TRANSIENT_RUN_FAILURE.test(String(item.error || "")));
const fatalRunFailures = rawResults.filter((item) => !item.ok && !TRANSIENT_RUN_FAILURE.test(String(item.error || "")));
const correctedClaims = rawResults.flatMap((item) => {
  if (!item.ok) return [];
  const claims = Array.isArray(item.deterministic?.overclaims) ? item.deterministic.overclaims : [];
  return claims
    .filter((claim) => KNOWN_FALSE_POSITIVE_OVERCLAIM.test(String(claim || "").trim()))
    .map((claim) => ({ id: item.id, claim }));
});
const effectiveFailures = rawResults.flatMap((item) => effectiveHardFailures(item).map((failure) => ({ id: item.id, failure })));
const markdownPath = resolve(RESULTS_DIR, latest.name.replace(/\.json$/u, ".md"));

const lines = [
  "",
  "## Style gate v3",
  "",
  "這一層只抓使用者明確想規避的 AI 文風；它不判斷牌義、星象或夢境依據。",
  "",
  `- **Flagged cases:** ${flagged.length}/${cases.length}`,
  "- 目標：0。這些是風格警告，不會把安全或來源問題混在一起。",
  "",
];

if (!flagged.length) {
  lines.push("- PASS：沒有抓到二分式翻轉、揭曉式總結或表演式思考。", "");
} else {
  for (const item of flagged) {
    lines.push(`### ${item.id} · ${item.mode}`, "");
    for (const warning of item.warnings) {
      lines.push(`- **${warning.label}**（${warning.id}）`);
      for (const match of warning.matches) lines.push(`  - \`${match}\``);
    }
    lines.push("");
  }
}

lines.push("## Eval gate corrections", "");
if (correctedClaims.length) {
  lines.push("以下 deterministic match 缺乏否定語境判斷，v3 不把它當 hard failure；LLM boundary rubric 仍會檢查完整句意。", "");
  for (const item of correctedClaims) lines.push(`- ${item.id}: \`${item.claim}\```);
  lines.push("");
}
if (transientFailures.length) {
  lines.push("以下屬暫時性基礎設施錯誤，不代表 Reading Quality 失敗；建議只重跑該 case。", "");
  for (const item of transientFailures) lines.push(`- ${item.id}: ${item.error}`);
  lines.push("");
}
if (!correctedClaims.length && !transientFailures.length) lines.push("- 無。", "");

lines.push(`- **Effective hard failures:** ${effectiveFailures.length}`);
lines.push(`- **Fatal run failures:** ${fatalRunFailures.length}`);
lines.push("");

await appendFile(markdownPath, `${lines.join("\n")}\n`, "utf8");
console.log(`Style gate warnings: ${flagged.length}/${cases.length}`);
console.log(`Effective hard failures: ${effectiveFailures.length}`);
console.log(`Transient run warnings: ${transientFailures.length}`);
console.log(`Fatal run failures: ${fatalRunFailures.length}`);
console.log(`Style report appended to: ${markdownPath}`);

process.exitCode = flagged.length || effectiveFailures.length || fatalRunFailures.length ? 1 : 0;
