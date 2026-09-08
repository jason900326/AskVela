import { createHash } from "node:crypto";
import { getOpenAI, CHAT_MODEL } from "./openai.js";
import {
  DREAM_READING_SCHEMA,
  DREAM_EXTRACTION_SCHEMA,
  buildDreamExtractionInstructions,
  buildDreamExtractionInput,
  buildDreamInstructions,
  buildDreamInput,
} from "./dream-prompts.js";
import {
  DREAM_SOURCE_METHOD,
  DREAM_THEME_EVIDENCE,
  getDreamEvidenceByKeys,
  publicDreamEvidence,
} from "./dream-source-corpus.js";

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{8,160}$/u;

export class DreamValidationError extends Error {
  constructor(message, code = "INVALID_DREAM_REQUEST") {
    super(message);
    this.name = "DreamValidationError";
    this.code = code;
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
  const dreamText = String(input?.dreamText || "").trim();
  if (dreamText.length < 2) throw new DreamValidationError("至少告訴我一個你還記得的畫面或東西。", "DREAM_TOO_SHORT");
  if (dreamText.length > 4000) throw new DreamValidationError("夢境描述目前最多 4000 個字元。", "DREAM_TOO_LONG");

  const wakingLifeContext = String(input?.wakingLifeContext || "").trim();
  if (wakingLifeContext.length > 1200) throw new DreamValidationError("現實背景目前最多 1200 個字元。", "DREAM_CONTEXT_TOO_LONG");

  const requestId = String(input?.requestId || "").trim();
  if (!REQUEST_ID_PATTERN.test(requestId)) throw new DreamValidationError("請重新整理頁面後再試一次。", "INVALID_REQUEST_ID");

  return { dreamText, wakingLifeContext, requestId };
}

export function dreamReadingId({ dreamText, wakingLifeContext, requestId }) {
  const digest = createHash("sha256")
    .update(`${requestId}|${dreamText}|${wakingLifeContext}`)
    .digest("hex")
    .slice(0, 32);
  return `dream_${digest}`;
}

function parseJsonOutput(response, errorMessage) {
  try {
    return JSON.parse(response.output_text || "");
  } catch {
    throw new DreamOutputError(errorMessage);
  }
}

export function evidenceForDreamExtraction(extraction) {
  const themeKeys = Array.isArray(extraction?.themes) ? extraction.themes : ["general"];
  const evidenceKeys = themeKeys.flatMap((theme) => DREAM_THEME_EVIDENCE[theme] || DREAM_THEME_EVIDENCE.general);
  if (Array.isArray(extraction?.emotions) && extraction.emotions.length) evidenceKeys.push("displacement");
  return getDreamEvidenceByKeys(evidenceKeys);
}

export function normalizeDreamOutput(value, allowedEvidenceIds = []) {
  if (!value || typeof value !== "object") throw new DreamOutputError();
  const overview = String(value.overview || "").trim();
  const wakingLifeConnection = String(value.wakingLifeConnection || "").trim();
  const groundingNote = String(value.groundingNote || "").trim();
  const basisNote = String(value.basisNote || "").trim();
  if (!overview || !wakingLifeConnection || !groundingNote || !basisNote) throw new DreamOutputError();

  const whatStandsOut = Array.isArray(value.whatStandsOut) ? value.whatStandsOut.map((item) => String(item || "").trim()).filter(Boolean) : [];
  const reflectionQuestions = Array.isArray(value.reflectionQuestions) ? value.reflectionQuestions.map((item) => String(item || "").trim()).filter(Boolean) : [];
  if (whatStandsOut.length < 1) throw new DreamOutputError();

  const allowed = new Set(allowedEvidenceIds);
  const hypotheses = Array.isArray(value.hypotheses) ? value.hypotheses.map((item) => ({
    title: String(item?.title || "").trim(),
    interpretation: String(item?.interpretation || "").trim(),
    evidenceIds: Array.isArray(item?.evidenceIds) ? item.evidenceIds.filter((id) => allowed.has(id)) : [],
  })).filter((item) => item.title && item.interpretation && item.evidenceIds.length) : [];
  if (hypotheses.length < 2) throw new DreamOutputError("夢境解讀缺少可追溯的假說。", "INVALID_DREAM_HYPOTHESES");

  return { overview, whatStandsOut, hypotheses, wakingLifeConnection, reflectionQuestions, groundingNote, basisNote };
}

export async function createDreamReading(input, { openai = null, model = CHAT_MODEL } = {}) {
  const normalized = normalizeDreamRequest(input);
  const client = openai || getOpenAI();

  const extractionResponse = await client.responses.create({
    model,
    instructions: buildDreamExtractionInstructions(),
    input: buildDreamExtractionInput(normalized),
    text: {
      format: {
        type: "json_schema",
        name: "askvela_dream_extraction",
        strict: true,
        schema: DREAM_EXTRACTION_SCHEMA,
      },
    },
  });
  const extraction = parseJsonOutput(extractionResponse, "夢境元素抽取失敗。");
  const evidence = evidenceForDreamExtraction(extraction);

  const readingResponse = await client.responses.create({
    model,
    instructions: buildDreamInstructions(),
    input: buildDreamInput({ ...normalized, extraction, evidence }),
    text: {
      format: {
        type: "json_schema",
        name: "askvela_dream_reading",
        strict: true,
        schema: DREAM_READING_SCHEMA,
      },
    },
  });
  const parsed = parseJsonOutput(readingResponse, "夢境解讀輸出失敗。");
  const result = normalizeDreamOutput(parsed, evidence.map((item) => item.id));

  return {
    kind: "dream",
    readingId: dreamReadingId(normalized),
    requestId: normalized.requestId,
    dreamText: normalized.dreamText,
    wakingLifeContext: normalized.wakingLifeContext,
    extraction,
    result,
    sources: publicDreamEvidence(evidence),
    sourceGrounded: true,
    sourceMode: DREAM_SOURCE_METHOD.mode,
    sourceNote: DREAM_SOURCE_METHOD.note,
    disclaimer: "這次解讀以 Freud 的歷史精神分析框架作為主要參考，不是現代臨床診斷、治療、預言或固定夢境字典。夢的意義仍以你自己的聯想、生活脈絡與感受為主。",
  };
}
