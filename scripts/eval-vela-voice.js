import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createAstrologyReading } from "../lib/astrology-reading.js";
import { createDreamReading } from "../lib/dream-reading.js";
import { interpretTarotReading } from "../lib/reading-interpreter.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CASES_PATH = resolve(ROOT, "eval/vela-voice-cases.json");
const RESULTS_DIR = resolve(ROOT, "eval/results");

const STYLE_PATTERNS = Object.freeze({
  reportFiller: /綜合來看|整體而言|總而言之|這組牌顯示|這張牌代表|這張牌顯示|在這個位置/gu,
  polishedContrast: /不是[^。！？\n]{0,32}(?:而是|反而是)|與其[^。！？\n]{0,32}不如|真正(?:的)?(?:重點|問題|需要|值得)|核心(?:在於|是)/gu,
  deterministic: /一定會|肯定會|絕對會|注定|命中注定|必然會|你(?:一定|肯定)是|對方(?:一定|肯定)(?:是|會)/gu,
  theatricalMysticism: /宇宙(?:正在)?告訴你|命運(?:正在)?(?:推著|告訴)|靈魂(?:正在)?(?:提醒|呼喚)|能量(?:正在)?告訴你/gu,
  genericReassurance: /不要擔心|一切都會好起來|你只需要相信|相信宇宙|一切都有安排/gu,
});

const SPOKEN_TEXTURE_PATTERN = /嗯……|我想一下|怎麼說(?:……|…)?|這裡有點微妙|我會先看這個|——|……/gu;

function collectStrings(value) {
  if (typeof value === "string") return value.trim() ? [value.trim()] : [];
  if (Array.isArray(value)) return value.flatMap(collectStrings);
  if (!value || typeof value !== "object") return [];
  return Object.values(value).flatMap(collectStrings);
}

function legacyPresentation(mode, reading) {
  if (mode === "tarot") {
    return {
      overview: reading.synthesis?.overview || "",
      narrative: reading.synthesis?.narrative || "",
    };
  }
  if (mode === "astrology") {
    return {
      overview: reading.result?.overview || "",
      narrative: reading.result?.overall || "",
    };
  }
  return {
    overview: reading.result?.overview || "",
    narrative: reading.result?.hypotheses?.[0]?.interpretation || reading.result?.wakingLifeConnection || "",
  };
}

function presentationFor(mode, reading) {
  if (reading?.velaSpeech?.overview && reading?.velaSpeech?.narrative) {
    return {
      overview: reading.velaSpeech.overview,
      narrative: reading.velaSpeech.narrative,
    };
  }
  return legacyPresentation(mode, reading);
}

function matches(text, pattern) {
  return [...text.matchAll(pattern)].map((match) => match[0]);
}

function deterministicMatches(text) {
  return [...text.matchAll(STYLE_PATTERNS.deterministic)]
    .filter((match) => {
      const start = match.index ?? 0;
      const prefix = text.slice(Math.max(0, start - 16), start);
      return !/(?:不代表|不等於|不是|未必|並非|不會|不表示)[^。！？\n]{0,10}$/u.test(prefix);
    })
    .map((match) => match[0]);
}

function shortSpokenSentenceCount(text) {
  return text
    .split(/[。！？\n]+/u)
    .map((part) => part.trim())
    .filter((part) => part.length >= 2 && part.length <= 12)
    .length;
}

function evaluateStyle(mode, presentation) {
  const text = collectStrings(presentation).join("\n");
  const flags = Object.fromEntries(
    Object.entries(STYLE_PATTERNS).map(([key, pattern]) => [
      key,
      key === "deterministic" ? deterministicMatches(text) : matches(text, pattern),
    ]),
  );
  const hedgeCount = (text.match(/可能|比較像|可以留意|也許|如果/gu) || []).length;
  const spokenTextureCount = matches(text, SPOKEN_TEXTURE_PATTERN).length;
  const shortSentenceCount = shortSpokenSentenceCount(text);
  const warnings = [];

  for (const [name, found] of Object.entries(flags)) {
    if (found.length) warnings.push(`${name}: ${[...new Set(found)].join("、")}`);
  }
  if (hedgeCount > 9) warnings.push(`hedging may be repetitive (${hedgeCount} conditional phrases)`);

  const overviewLength = String(presentation.overview || "").length;
  if (overviewLength > 90) warnings.push(`${mode} spoken opening is long (${overviewLength} chars)`);
  if (text.length > 450) warnings.push(`${mode} primary speech is long (${text.length} chars)`);

  return {
    totalCharacters: text.length,
    overviewCharacters: overviewLength,
    hedgeCount,
    spokenTextureCount,
    shortSentenceCount,
    flags,
    warnings,
  };
}

async function runCase(testCase) {
  const startedAt = Date.now();
  let reading;

  if (testCase.mode === "tarot") {
    reading = await interpretTarotReading(testCase.input);
  } else if (testCase.mode === "astrology") {
    reading = await createAstrologyReading(testCase.input);
  } else if (testCase.mode === "dream") {
    reading = await createDreamReading(testCase.input);
  } else {
    throw new Error(`Unknown voice eval mode: ${testCase.mode}`);
  }

  const presentation = presentationFor(testCase.mode, reading);
  return {
    ...testCase,
    durationMs: Date.now() - startedAt,
    presentation,
    speechRendererStatus: reading.velaSpeech?.status || "legacy",
    speechRendererAttempts: reading.velaSpeech?.attempts || 0,
    speechRendererViolations: reading.velaSpeech?.violations || [],
    automaticReview: evaluateStyle(testCase.mode, presentation),
    rawReading: reading,
  };
}

function markdownValue(value, indent = "") {
  if (typeof value === "string") return value ? `${indent}${value}` : `${indent}（空）`;
  if (Array.isArray(value)) {
    if (!value.length) return `${indent}（空）`;
    return value.map((item) => typeof item === "string"
      ? `${indent}- ${item}`
      : `${indent}- ${JSON.stringify(item, null, 2).replaceAll("\n", `\n${indent}  `)}`).join("\n");
  }
  if (!value || typeof value !== "object") return `${indent}${String(value ?? "")}`;
  return Object.entries(value).map(([key, item]) => {
    if (typeof item === "string") return `${indent}**${key}**\n\n${indent}${item || "（空）"}`;
    if (Array.isArray(item)) return `${indent}**${key}**\n\n${markdownValue(item, indent)}`;
    return `${indent}**${key}**\n\n${markdownValue(item, indent)}`;
  }).join("\n\n");
}

function buildMarkdown(results, meta) {
  const successful = results.filter((item) => item.ok);
  const failed = results.filter((item) => !item.ok);
  const lines = [
    "# Vela Voice Evaluation",
    "",
    `Generated: ${meta.generatedAt}`,
    `Cases: ${results.length} (${successful.length} succeeded, ${failed.length} failed)`,
    "",
    "## How to review",
    "",
    "This worksheet judges only each mode's primary Vela Speech layer. Full grounded analysis remains in rawReading for verification and in the product behind progressive disclosure.",
    "",
    "- Naturalness: sounds like a real person using Taiwan Traditional Chinese, including occasional imperfect rhythm when it helps.",
    "- Directness: reaches the useful point early without report-style preamble or polished AI antithesis.",
    "- Vela consistency: feels like the same Vela across Tarot, Astrology, and Dream.",
    "- Grounding / boundaries: stays source-grounded and avoids certainty, diagnosis, invented intent, or high-stakes directives.",
    "- Usefulness: leaves the user with a clear insight or next thing to notice.",
    "",
  ];

  for (const item of results) {
    lines.push(`## ${item.id} · ${item.mode}`);
    lines.push("");
    lines.push(`**Review focus:** ${(item.reviewFocus || []).join(" / ")}`);
    lines.push("");
    lines.push(`**Speech renderer:** ${item.speechRendererStatus || "unknown"}`);
    lines.push(`**Speech attempts:** ${item.speechRendererAttempts || 0}`);
    if (item.speechRendererViolations?.length) {
      lines.push(`**Speech violations before fallback/retry:** ${item.speechRendererViolations.join(", ")}`);
    }
    lines.push("");
    lines.push("**Input**");
    lines.push("");
    lines.push("```json");
    lines.push(JSON.stringify(item.input, null, 2));
    lines.push("```");
    lines.push("");

    if (!item.ok) {
      lines.push(`**RUN FAILED:** ${item.error}`);
      lines.push("");
      continue;
    }

    lines.push("### User-facing output");
    lines.push("");
    lines.push(markdownValue(item.presentation));
    lines.push("");
    lines.push("### Automatic style flags");
    lines.push("");
    if (item.automaticReview.warnings.length) {
      for (const warning of item.automaticReview.warnings) lines.push(`- ${warning}`);
    } else {
      lines.push("- No automatic style warnings. Human review is still required.");
    }
    lines.push(`- Total user-facing characters: ${item.automaticReview.totalCharacters}`);
    lines.push(`- Spoken-texture markers: ${item.automaticReview.spokenTextureCount} (diagnostic only; zero is not automatically bad)`);
    lines.push(`- Short spoken sentences/fragments: ${item.automaticReview.shortSentenceCount} (diagnostic only)`);
    lines.push("");
    lines.push("### Human review");
    lines.push("");
    lines.push("- Naturalness: __ / 5");
    lines.push("- Directness: __ / 5");
    lines.push("- Vela consistency: __ / 5");
    lines.push("- Grounding / boundaries: __ / 5");
    lines.push("- Usefulness: __ / 5");
    lines.push("- Verdict: good / mixed / bad");
    lines.push("- Keep: ");
    lines.push("- Change: ");
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

const cases = JSON.parse(await readFile(CASES_PATH, "utf8"));
const filter = String(process.argv[2] || "all").trim().toLowerCase();
const maxCases = Math.max(0, Number(process.env.VELA_EVAL_MAX_CASES || 0) || 0);
let selected = filter === "all"
  ? cases
  : cases.filter((item) => item.mode === filter || item.id.toLowerCase().includes(filter));
if (maxCases) selected = selected.slice(0, maxCases);

if (!selected.length) {
  throw new Error(`No Vela voice cases matched '${filter}'. Use all, tarot, astrology, dream, or part of a case ID.`);
}

console.log(`=== Vela voice evaluation: ${selected.length} case(s) ===`);
console.log("Do not treat automatic flags as the final verdict; they only surface patterns for human review.");

const results = [];
for (let index = 0; index < selected.length; index += 1) {
  const testCase = selected[index];
  process.stdout.write(`[${index + 1}/${selected.length}] ${testCase.id} (${testCase.mode}) ... `);
  try {
    const result = await runCase(testCase);
    results.push({ ...result, ok: true });
    console.log(`ok ${(result.durationMs / 1000).toFixed(1)}s`);
  } catch (error) {
    results.push({
      ...testCase,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
    console.log("FAILED");
  }
}

const generatedAt = new Date().toISOString();
const stamp = generatedAt.replaceAll(":", "-").replace(".", "-");
await mkdir(RESULTS_DIR, { recursive: true });
const prefix = `vela-voice-${filter}-${stamp}`;
const jsonPath = resolve(RESULTS_DIR, `${prefix}.json`);
const markdownPath = resolve(RESULTS_DIR, `${prefix}.md`);

await writeFile(jsonPath, `${JSON.stringify({ generatedAt, filter, results }, null, 2)}\n`, "utf8");
await writeFile(markdownPath, buildMarkdown(results, { generatedAt, filter }), "utf8");

const succeeded = results.filter((item) => item.ok).length;
console.log(`\nCompleted: ${succeeded}/${results.length} succeeded.`);
console.log(`JSON: ${jsonPath}`);
console.log(`Review worksheet: ${markdownPath}`);
if (succeeded !== results.length) process.exitCode = 1;
