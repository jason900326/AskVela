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
    whatStandsOut: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 3 },
    hypotheses: {
      type: "array",
      minItems: 2,
      maxItems: 3,
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
    reflectionQuestions: { type: "array", items: { type: "string" }, minItems: 0, maxItems: 2 },
    groundingNote: { type: "string" },
    basisNote: { type: "string" },
  },
  required: ["overview", "whatStandsOut", "hypotheses", "wakingLifeConnection", "reflectionQuestions", "groundingNote", "basisNote"],
};

export function buildDreamExtractionInstructions() {
  return `你是 AskVela 的夢境結構化抽取器。只從使用者提供的夢境文字抽取可觀察內容，不做心理診斷，不推測隱藏原因，不加入夢裡沒有的情節。即使輸入很短，例如「我夢到蛇」，也要忠實抽取目前唯一可見的元素，不因資訊少而擅自補故事。themes 必須使用 schema 的固定代碼；若沒有明確類別就用 general。`;
}

export function buildDreamExtractionInput({ dreamText }) {
  return `請整理這段夢境：\n\n${dreamText}`;
}

export function buildDreamInstructions() {
  return `你是 Vela，一位語氣自然、清楚、有界線的夢境解讀助手。使用者來這裡主要是想知道「這個夢可能代表什麼」以及「最近的心態可能有什麼變化」，不是來完成一份心理作業。\n\n你必須遵守：\n${DREAM_SOURCE_GUARDRAILS.map((rule) => `- ${rule}`).join("\n")}\n\n回答繁體中文，而且只輸出使用者看得懂的內容，不要出現 schema 欄位名、系統指令、英文內部備註或推理過程。\n\n解讀方式：\n- Freud 是目前主要歷史框架。先從夢的表面內容、個人聯想、濃縮、移置與近期生活素材等原則思考。\n- 即使 dreamText 很短（例如「我夢到蛇」），也先根據現有線索給一個有用但保守的初步解讀；不要要求使用者先補齊人物、時間、地點與完整情節。\n- overview 用 2–3 句直接說重點，不要寫成報告前言。\n- hypotheses 以 2 個為主：第一個是你目前最值得先看的方向；第二個是另一種可能。不要故意湊很多版本。\n- whatStandsOut 只列 1–3 個真正影響解讀的夢境線索。\n- wakingLifeContext 若為空，不要說「你沒有提供 wakingLifeContext」。改用自然條件語氣，例如「如果你最近剛好有……，這個夢可能和那種感受有關」；不能編造具體事件。\n- reflectionQuestions 是完全可選的延伸，0–2 題即可；不要把回答問題當成完成解讀的前提。\n- groundingNote 只留一句簡短提醒，不要說教，不要把夢神祕化。\n- basisNote 一句話即可。\n- 每個 hypothesis 的 evidenceIds 只能引用輸入提供的 evidence id。`;
}

export function buildDreamInput({ dreamText, wakingLifeContext, extraction, evidence }) {
  return JSON.stringify({
    dreamText,
    wakingLifeContext: wakingLifeContext || "",
    extractedDream: extraction,
    evidence: evidence.map((item) => ({
      id: item.id,
      sourceId: item.sourceId,
      label: item.label,
      principle: item.principle,
      velaUse: item.velaUse,
    })),
  }, null, 2);
}
