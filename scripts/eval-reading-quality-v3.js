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
const cases = (latest.data.results || []).map((item) => ({
  id: item.id,
  mode: item.mode,
  warnings: item.ok ? styleWarnings(item.mainOutput) : [],
}));
const flagged = cases.filter((item) => item.warnings.length);
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

await appendFile(markdownPath, `${lines.join("\n")}\n`, "utf8");
console.log(`Style gate warnings: ${flagged.length}/${cases.length}`);
console.log(`Style report appended to: ${markdownPath}`);

if (flagged.length) process.exitCode = 1;
