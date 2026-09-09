import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createAstrologyReading } from "../lib/astrology-reading.js";
import { createDreamReading } from "../lib/dream-reading.js";
import { getOpenAI, CHAT_MODEL } from "../lib/openai.js";
import { interpretTarotReading } from "../lib/reading-interpreter.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CASES_PATH = resolve(ROOT, "eval/vela-voice-cases.json");
const RUBRIC_PATH = resolve(ROOT, "eval/reading-quality-rubric.json");
const RESULTS_DIR = resolve(ROOT, "eval/results");
const EVAL_MODEL = process.env.OPENAI_EVAL_MODEL || CHAT_MODEL;
const SKIP_JUDGE = process.env.VELA_EVAL_SKIP_JUDGE === "1";
const FAIL_BELOW = Number(process.env.VELA_EVAL_FAIL_BELOW || 0) || 0;

const JUDGE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["criteria", "overallScore", "verdict", "summary", "regressions"],
  properties: {
    criteria: {
      type: "array",
      minItems: 6,
      maxItems: 6,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "score", "reason"],
        properties: {
          id: {
            type: "string",
            enum: [
              "userConnection",
              "evidenceGrounding",
              "velaVoice",
              "followUpQuality",
              "uncertaintyBoundary",
              "sourcePrivacy"
            ]
          },
          score: { type: "integer", minimum: 1, maximum: 5 },
          reason: { type: "string" }
        }
      }
    },
    overallScore: { type: "number", minimum: 1, maximum: 5 },
    verdict: { type: "string", enum: ["pass", "mixed", "fail"] },
    summary: { type: "string" },
    regressions: { type: "array", items: { type: "string" }, maxItems: 6 }
  }
};

const INTERNAL_SOURCE_PATTERN = /\b(?:Arthur Edward Waite|A\.?\s*E\.?\s*Waite|Waite|S\.?\s*L\.?\s*MacGregor Mathers|MacGregor Mathers|Mathers|Sigmund Freud|Freud)\b|偉特|魏特|馬瑟斯|弗洛伊德|佛洛伊德/giu;
const INTERNAL_SYSTEM_PATTERN = /schema|prompt|system instruction|sourceId|citationIds|retrievedFreudPassages|skyContext|Layer [ABC]/giu;
const DETERMINISTIC_PATTERN = /一定會|肯定會|絕對會|注定|命中注定|必然會|你(?:一定|肯定)是|對方(?:一定|肯定)(?:是|會)|證明(?:他|她|對方)|代表(?:他|她|對方)一定/gu;

function collectStrings(value) {
  if (typeof value === "string") return value.trim() ? [value.trim()] : [];
  if (Array.isArray(value)) return value.flatMap(collectStrings);
  if (!value || typeof value !== "object") return [];
  return Object.values(value).flatMap(collectStrings);
}

function mainOutputFor(mode, reading) {
  if (mode === "tarot") {
    return {
      overview: reading.synthesis?.overview || "",
      narrative: reading.synthesis?.narrative || "",
      cards: (reading.cards || []).map((card) => ({
        position: card.positionLabelZhTw,
        card: `${card.nameZhTw}・${card.orientation}`,
        interpretation: card.contextInterpretation,
        practicalFocus: card.practicalFocus
      })),
      crossCardPattern: reading.synthesis?.crossCardPattern || "",
      practicalGuidance: reading.synthesis?.practicalGuidance || [],
      reflectionQuestions: reading.synthesis?.reflectionQuestions || []
    };
  }

  if (mode === "astrology") {
    return {
      overview: reading.result?.overview || "",
      overall: reading.result?.overall || "",
      relationships: reading.result?.relationships || "",
      workStudy: reading.result?.workStudy || "",
      energy: reading.result?.energy || "",
      focusAreas: reading.result?.focusAreas || [],
      practicalGuidance: reading.result?.practicalGuidance || [],
      reflectionQuestion: reading.result?.reflectionQuestion || ""
    };
  }

  return {
    overview: reading.result?.overview || "",
    whatStandsOut: reading.result?.whatStandsOut || [],
    hypotheses: reading.result?.hypotheses?.map((item) => ({
      title: item.title,
      interpretation: item.interpretation
    })) || [],
    wakingLifeConnection: reading.result?.wakingLifeConnection || "",
    reflectionQuestions: reading.result?.reflectionQuestions || [],
    groundingNote: reading.result?.groundingNote || ""
  };
}

function evidenceForJudge(mode, reading) {
  if (mode === "tarot") {
    return {
      question: reading.question,
      spread: reading.spread,
      cards: (reading.cards || []).map((card) => ({
        position: card.positionLabelZhTw,
        nameZhTw: card.nameZhTw,
        orientation: card.orientation,
        sourceMeaning: card.sourceMeaning,
        sourceLimitations: card.sourceLimitations,
        citationIds: card.citationIds
      })),
      safety: reading.safety
    };
  }

  if (mode === "astrology") {
    return {
      sign: reading.sign,
      period: reading.period,
      localDate: reading.localDate,
      skyContext: {
        dateRange: reading.skyContext?.dateRange,
        signals: reading.skyContext?.signals,
        snapshots: reading.skyContext?.snapshots?.map((snapshot) => ({
          date: snapshot.date,
          sunSign: snapshot.sun?.sign?.nameZhTw,
          moonSign: snapshot.moon?.sign?.nameZhTw,
          moonPhase: snapshot.moonPhase?.nameZhTw,
          sunMoonAspect: snapshot.sunMoonAspect
            ? {
                label: snapshot.sunMoonAspect.labelZhTw,
                orb: snapshot.sunMoonAspect.orb,
                tone: snapshot.sunMoonAspect.tone
              }
            : null
        }))
      },
      sources: reading.sources
    };
  }

  return {
    dreamText: reading.dreamText,
    wakingLifeContext: reading.wakingLifeContext,
    extraction: reading.extraction,
    sources: reading.sources,
    retrievedSources: (reading.retrievedSources || []).slice(0, 4).map((item) => ({
      chapter: item.chapter,
      similarity: item.similarity,
      excerpt: String(item.content || item.text || "").slice(0, 700)
    })),
    safety: reading.safety
  };
}

function deterministicReview(mainOutput) {
  const text = collectStrings(mainOutput).join("\n");
  const sourceLeaks = [...new Set(text.match(INTERNAL_SOURCE_PATTERN) || [])];
  const systemLeaks = [...new Set(text.match(INTERNAL_SYSTEM_PATTERN) || [])];
  const overclaims = [...new Set(text.match(DETERMINISTIC_PATTERN) || [])];
  return {
    sourceLeaks,
    systemLeaks,
    overclaims,
    hardFailures: [
      ...(sourceLeaks.length ? [`internal source names: ${sourceLeaks.join("、")}`] : []),
      ...(systemLeaks.length ? [`internal system terms: ${systemLeaks.join("、")}`] : []),
      ...(overclaims.length ? [`deterministic claims: ${overclaims.join("、")}`] : [])
    ]
  };
}

async function runReading(testCase) {
  if (testCase.mode === "tarot") return interpretTarotReading(testCase.input);
  if (testCase.mode === "astrology") return createAstrologyReading(testCase.input);
  if (testCase.mode === "dream") return createDreamReading(testCase.input);
  throw new Error(`Unknown reading-quality mode: ${testCase.mode}`);
}

function rubricInstructions(rubric) {
  const criteria = rubric.criteria.map((item) => [
    `${item.id}｜${item.label}`,
    item.description,
    `5 分：${item.score5}`,
    `3 分：${item.score3}`,
    `1 分：${item.score1}`
  ].join("\n")).join("\n\n");

  return [
    "你是 AskVela 的固定 Reading Quality 評測器，不是解讀者。",
    "請只評估輸入裡這一次已生成的結果，不要自行重做塔羅、占星或夢境解讀。",
    "三種模式一律使用完全相同的六項 1–5 分標準。",
    "評分時以 evidenceSnapshot 判斷有沒有根據；不要因為文句好聽就提高 evidenceGrounding。",
    "followUpQuality：沒有追問不等於扣分。如果這次已經足夠、沒有必要再問，合理地不追問可以是 5 分。",
    "sourcePrivacy：只評 mainOutput。來源／方法展開區不在 mainOutput 內，因此不要因 evidenceSnapshot 出現作者或來源資料而扣分。",
    "uncertaintyBoundary：不要把『可能、可以留意』出現得少就當成危險；重點是有沒有把推論冒充成確定事實。",
    "verdict 建議：六項皆 >=4 且無重大問題為 pass；有一項 3 或可修正退步為 mixed；任何核心錯誤、捏造依據、過度斷言或內部來源外洩為 fail。",
    "reason 必須具體指出這次輸出的文字或依據，不要寫空泛評語。",
    "請用繁體中文。",
    "",
    criteria
  ].join("\n");
}

async function judgeReading(openai, rubric, payload) {
  const response = await openai.responses.create({
    model: EVAL_MODEL,
    instructions: rubricInstructions(rubric),
    input: JSON.stringify(payload, null, 2),
    text: {
      format: {
        type: "json_schema",
        name: "askvela_reading_quality_eval",
        strict: true,
        schema: JUDGE_SCHEMA
      }
    }
  });

  return JSON.parse(response.output_text || "");
}

function scoreMap(judge) {
  return Object.fromEntries((judge?.criteria || []).map((item) => [item.id, item.score]));
}

function buildMarkdown(results, rubric, meta) {
  const lines = [
    "# AskVela Reading Quality",
    "",
    `Generated: ${meta.generatedAt}`,
    `Judge model: ${meta.evalModel}${meta.skipJudge ? "（本次略過 LLM judge）" : ""}`,
    `Cases: ${results.length}`,
    "",
    "## 固定評分標準",
    "",
    ...rubric.criteria.map((item) => `- **${item.label}**：${item.description}`),
    "",
    "## Summary",
    "",
    "| Case | Mode | User | Evidence | Voice | Follow-up | Boundary | Source | Overall | Verdict |",
    "| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |"
  ];

  for (const item of results) {
    if (!item.ok) {
      lines.push(`| ${item.id} | ${item.mode} | - | - | - | - | - | - | - | RUN FAILED |`);
      continue;
    }
    const scores = scoreMap(item.judge);
    lines.push(`| ${item.id} | ${item.mode} | ${scores.userConnection ?? "-"} | ${scores.evidenceGrounding ?? "-"} | ${scores.velaVoice ?? "-"} | ${scores.followUpQuality ?? "-"} | ${scores.uncertaintyBoundary ?? "-"} | ${scores.sourcePrivacy ?? "-"} | ${item.judge?.overallScore ?? "-"} | ${item.judge?.verdict || (item.deterministic.hardFailures.length ? "fail" : "not judged")} |`);
  }

  lines.push("");
  for (const item of results) {
    lines.push(`## ${item.id} · ${item.mode}`);
    lines.push("");
    lines.push(`**Review focus:** ${(item.reviewFocus || []).join(" / ")}`);
    lines.push("");
    if (!item.ok) {
      lines.push(`**RUN FAILED:** ${item.error}`);
      lines.push("");
      continue;
    }
    lines.push("### Deterministic gates");
    lines.push("");
    if (item.deterministic.hardFailures.length) {
      item.deterministic.hardFailures.forEach((failure) => lines.push(`- FAIL: ${failure}`));
    } else {
      lines.push("- PASS: 沒有偵測到內部來源名稱、系統字眼或明顯確定式斷言。 ");
    }
    lines.push("");

    if (item.judge) {
      lines.push("### Fixed rubric scores");
      lines.push("");
      for (const criterion of item.judge.criteria) {
        const label = rubric.criteria.find((candidate) => candidate.id === criterion.id)?.label || criterion.id;
        lines.push(`- **${label}: ${criterion.score}/5** — ${criterion.reason}`);
      }
      lines.push("");
      lines.push(`**Overall: ${item.judge.overallScore}/5 · ${item.judge.verdict}**`);
      lines.push("");
      lines.push(item.judge.summary);
      if (item.judge.regressions?.length) {
        lines.push("");
        lines.push("**Regressions / next fixes**");
        item.judge.regressions.forEach((regression) => lines.push(`- ${regression}`));
      }
    } else {
      lines.push("### Fixed rubric scores");
      lines.push("");
      lines.push("- 本次設定 VELA_EVAL_SKIP_JUDGE=1，只跑 deterministic gates。 ");
    }

    lines.push("");
    lines.push("<details><summary>Main output</summary>");
    lines.push("");
    lines.push("```json");
    lines.push(JSON.stringify(item.mainOutput, null, 2));
    lines.push("```");
    lines.push("");
    lines.push("</details>");
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

const cases = JSON.parse(await readFile(CASES_PATH, "utf8"));
const rubric = JSON.parse(await readFile(RUBRIC_PATH, "utf8"));
const filter = String(process.argv[2] || "all").trim().toLowerCase();
const maxCases = Math.max(0, Number(process.env.VELA_EVAL_MAX_CASES || 0) || 0);
let selected = filter === "all"
  ? cases
  : cases.filter((item) => item.mode === filter || item.id.toLowerCase().includes(filter));
if (maxCases) selected = selected.slice(0, maxCases);
if (!selected.length) throw new Error(`No reading-quality cases matched '${filter}'.`);

console.log(`=== AskVela Reading Quality v${rubric.version}: ${selected.length} case(s) ===`);
console.log(`Judge: ${SKIP_JUDGE ? "skipped" : EVAL_MODEL}`);
console.log("The fixed case set is shared with eval/vela-voice-cases.json so prompt changes are compared against the same inputs.");

const openai = SKIP_JUDGE ? null : getOpenAI();
const results = [];
for (let index = 0; index < selected.length; index += 1) {
  const testCase = selected[index];
  process.stdout.write(`[${index + 1}/${selected.length}] ${testCase.id} (${testCase.mode}) ... `);
  const startedAt = Date.now();
  try {
    const reading = await runReading(testCase);
    const mainOutput = mainOutputFor(testCase.mode, reading);
    const deterministic = deterministicReview(mainOutput);
    const judge = SKIP_JUDGE
      ? null
      : await judgeReading(openai, rubric, {
          caseId: testCase.id,
          mode: testCase.mode,
          userInput: testCase.input,
          reviewFocus: testCase.reviewFocus || [],
          mainOutput,
          evidenceSnapshot: evidenceForJudge(testCase.mode, reading),
          deterministicFlags: deterministic
        });

    results.push({
      ...testCase,
      ok: true,
      durationMs: Date.now() - startedAt,
      mainOutput,
      deterministic,
      judge
    });
    console.log(`ok ${((Date.now() - startedAt) / 1000).toFixed(1)}s${judge ? ` · ${judge.overallScore}/5 ${judge.verdict}` : ""}`);
  } catch (error) {
    results.push({
      ...testCase,
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    });
    console.log("FAILED");
  }
}

const generatedAt = new Date().toISOString();
const stamp = generatedAt.replaceAll(":", "-").replace(".", "-");
await mkdir(RESULTS_DIR, { recursive: true });
const prefix = `reading-quality-${filter}-${stamp}`;
const jsonPath = resolve(RESULTS_DIR, `${prefix}.json`);
const markdownPath = resolve(RESULTS_DIR, `${prefix}.md`);
const meta = { generatedAt, evalModel: EVAL_MODEL, skipJudge: SKIP_JUDGE, rubricVersion: rubric.version };
await writeFile(jsonPath, `${JSON.stringify({ ...meta, filter, results }, null, 2)}\n`, "utf8");
await writeFile(markdownPath, buildMarkdown(results, rubric, meta), "utf8");

const failures = results.filter((item) => !item.ok || item.deterministic?.hardFailures?.length);
const scored = results.filter((item) => item.ok && item.judge);
const belowThreshold = FAIL_BELOW > 0
  ? scored.filter((item) => Number(item.judge.overallScore || 0) < FAIL_BELOW)
  : [];

console.log(`\nJSON: ${jsonPath}`);
console.log(`Review worksheet: ${markdownPath}`);
console.log(`Hard failures: ${failures.length}`);
if (scored.length) {
  const average = scored.reduce((sum, item) => sum + Number(item.judge.overallScore || 0), 0) / scored.length;
  console.log(`Average score: ${average.toFixed(2)}/5`);
}
if (FAIL_BELOW > 0) console.log(`Fail-below threshold: ${FAIL_BELOW}/5 (${belowThreshold.length} below)`);
if (failures.length || belowThreshold.length) process.exitCode = 1;
