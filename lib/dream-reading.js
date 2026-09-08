import { createHash } from "node:crypto";
import { buildDreamEvidence, publicDreamEvidence } from "./dream-evidence.js";
import { extractDreamFeatures, normalizeDreamText } from "./dream-extractor.js";
import { getOpenAI, CHAT_MODEL } from "./openai.js";
import { buildDreamInput, buildDreamInstructions, DREAM_READING_SCHEMA } from "./dream-prompts.js";

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{8,160}$/u;

export class DreamValidationError extends Error {
  constructor(message, code = "INVALID_DREAM_REQUEST") {
    super(message);
    this.name = "DreamValidationError";
    this.code = code;
  }
}

export class DreamSourceError extends Error {
  constructor(message = "目前沒有足夠的可追溯夢境來源完成這次解讀。") {
    super(message);
    this.name = "DreamSourceError";
    this.code = "DREAM_SOURCES_NOT_READY";
  }
}

export class DreamOutputError extends Error {
  constructor(message = "Vela 沒有回傳有效的夢境解讀。") {
    super(message);
    this.name = "DreamOutputError";
    this.code = "INVALID_DREAM_OUTPUT";
  }
}

export function normalizeDreamRequest(input) {
  const dreamText = normalizeDreamText(input?.dreamText, 3000);
  if (dreamText.length < 10) throw new DreamValidationError("再多描述一點夢裡發生的事，我才有足夠內容可以整理。", "DREAM_TOO_SHORT");
  const contextText = normalizeDreamText(input?.contextText, 800);
  const requestId = String(input?.requestId || "").trim();
  if (!REQUEST_ID_PATTERN.test(requestId)) throw new DreamValidationError("請重新整理頁面後再試一次。", "INVALID_REQUEST_ID");
  return { dreamText, contextText, requestId };
}

export function dreamReadingId({ dreamText, contextText, requestId }) {
  const digest = createHash("sha256")
    .update(`${dreamText}|${contextText}|${requestId}`)
    .digest("hex")
    .slice(0, 32);
  return `dream_${digest}`;
}

export function normalizeDreamOutput(value, evidenceIds = null) {
  if (!value || typeof value !== "object") throw new DreamOutputError();
  const textFields = ["title", "dreamSummary", "emotionalThread", "interpretation", "nextStep", "basisNote"];
  for (const field of textFields) {
    if (!String(value[field] || "").trim()) throw new DreamOutputError(`夢境解讀缺少 ${field}。`);
  }
  if (!Array.isArray(value.sourceObservations) || value.sourceObservations.length < 2 || value.sourceObservations.length > 4) {
    throw new DreamOutputError("夢境解讀缺少來源觀察。");
  }
  const sourceObservations = value.sourceObservations.map((item) => ({
    evidenceId: String(item?.evidenceId || "").trim(),
    observation: String(item?.observation || "").trim(),
  }));
  if (sourceObservations.some((item) => !item.evidenceId || !item.observation)) throw new DreamOutputError("夢境來源觀察格式不正確。");
  if (evidenceIds && sourceObservations.some((item) => !evidenceIds.has(item.evidenceId))) {
    throw new DreamOutputError("夢境解讀引用了未提供的來源證據。");
  }
  if (!Array.isArray(value.possibleConnections) || value.possibleConnections.length < 2 || value.possibleConnections.length > 3
    || value.possibleConnections.some((item) => !String(item || "").trim())) {
    throw new DreamOutputError("夢境解讀需要 2–3 個可能連結。");
  }
  if (!Array.isArray(value.reflectionQuestions) || value.reflectionQuestions.length !== 2
    || value.reflectionQuestions.some((item) => !String(item || "").trim())) {
    throw new DreamOutputError("夢境解讀需要兩個反思問題。");
  }
  return {
    title: String(value.title).trim(),
    dreamSummary: String(value.dreamSummary).trim(),
    emotionalThread: String(value.emotionalThread).trim(),
    sourceObservations,
    interpretation: String(value.interpretation).trim(),
    possibleConnections: value.possibleConnections.map((item) => String(item).trim()),
    reflectionQuestions: value.reflectionQuestions.map((item) => String(item).trim()),
    nextStep: String(value.nextStep).trim(),
    basisNote: String(value.basisNote).trim(),
  };
}

export async function createDreamReading(input, { openai = null, model = CHAT_MODEL } = {}) {
  const normalized = normalizeDreamRequest(input);
  const extracted = extractDreamFeatures(normalized.dreamText);
  const evidence = buildDreamEvidence(extracted);
  if (!evidence.sufficient) throw new DreamSourceError();

  const client = openai || getOpenAI();
  const response = await client.responses.create({
    model,
    instructions: buildDreamInstructions(),
    input: buildDreamInput({ ...normalized, extracted, evidence }),
    text: {
      format: {
        type: "json_schema",
        name: "askvela_dream_reading",
        strict: true,
        schema: DREAM_READING_SCHEMA,
      },
    },
  });

  let parsed;
  try {
    parsed = JSON.parse(response.output_text || "");
  } catch {
    throw new DreamOutputError();
  }
  const evidenceIds = new Set(evidence.items.map((item) => item.id));

  return {
    kind: "dream",
    readingId: dreamReadingId(normalized),
    requestId: normalized.requestId,
    dreamText: normalized.dreamText,
    contextText: normalized.contextText,
    extracted,
    result: normalizeDreamOutput(parsed, evidenceIds),
    sources: publicDreamEvidence(evidence),
    sourceGrounded: true,
    disclaimer: "夢境解讀是以歷史夢心理學來源做的象徵性反思，不是診斷、治療、預言，也不代表某個符號有唯一固定意義。若夢讓你持續痛苦或影響生活，可以考慮和可信任的人或合格專業人士談談。",
  };
}
