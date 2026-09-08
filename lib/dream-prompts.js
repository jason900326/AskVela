import { DREAM_SOURCE_GUARDRAILS } from "./dream-source-corpus.js";

export const DREAM_EXTRACTION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    people: { type: "array", items: { type: "string" }, maxItems: 8 },
    places: { type: "array", items: { type: "string" }, maxItems: 8 },
    objects: { type: "array", items: { type: "string" }, maxItems: 10 },
    actions: { type: "array", items: { type: "string" }, maxItems: 10 },
    emotions: { type: "array", items: { type: "string" }, maxItems: 8 },
    themes: {
      type: "array",
      items: { type: "string", enum: ["pursuit", "falling", "water", "travel", "schoolWork", "relationship", "homeFamily", "trappedLost", "bodyExposure", "deathLoss", "general"] },
      minItems: 1,
      maxItems: 5,
    },
    notableImages: { type: "array", items: { type: "string" }, maxItems: 8 },
    summary: { type: "string" },
  },
  required: ["people", "places", "objects", "actions", "emotions", "themes", "notableImages", "summary"],
};

export const DREAM_READING_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    overview: { type: "string" },
    whatStandsOut: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 5 },
    hypotheses: {
      type: "array",
      minItems: 2,
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          interpretation: { type: "string" },
          evidenceIds: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 4 },
        },
        required: ["title", "interpretation", "evidenceIds"],
      },
    },
    wakingLifeConnection: { type: "string" },
    reflectionQuestions: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 4 },
    groundingNote: { type: "string" },
    basisNote: { type: "string" },
  },
  required: ["overview", "whatStandsOut", "hypotheses", "wakingLifeConnection", "reflectionQuestions", "groundingNote", "basisNote"],
};

export function buildDreamExtractionInstructions() {
  return `你是 AskVela 的夢境結構化抽取器。只從使用者提供的夢境文字抽取可觀察內容，不做心理診斷，不推測隱藏原因，不加入夢裡沒有的情節。themes 必須使用 schema 的固定代碼；若沒有明確類別就用 general。`;
}

export function buildDreamExtractionInput({ dreamText }) {
  return `請整理這段夢境：\n\n${dreamText}`;
}

export function buildDreamInstructions() {
  return `你是 Vela，一位語氣自然、清楚、有界線的夢境解讀助手。\n\n你必須遵守：\n${DREAM_SOURCE_GUARDRAILS.map((rule) => `- ${rule}`).join("\n")}\n\n回答繁體中文。先忠實看夢裡出現什麼，再提出 2–4 個可以同時成立的解讀假說。不要把象徵當成固定答案。每個 hypothesis 的 evidenceIds 只能引用輸入提供的 evidence id。wakingLifeContext 若為空，必須明說需要使用者自行對照最近生活，而不是替他編造現實背景。groundingNote 要短、實際，不神祕化夢境。`;
}

export function buildDreamInput({ dreamText, wakingLifeContext, extraction, evidence }) {
  return JSON.stringify({
    dreamText,
    wakingLifeContext: wakingLifeContext || "",
    extractedDream: extraction,
    evidence: evidence.map((item) => ({ id: item.id, label: item.label, principle: item.principle, velaUse: item.velaUse })),
  }, null, 2);
}
