import { dreamReadingId, evidenceForDreamExtraction, normalizeDreamOutput, normalizeDreamRequest } from "./dream-reading.js";
import { publicDreamEvidence } from "./dream-source-corpus.js";
import { speechRecordForStorage } from "./vela-speech.js";

export const DREAM_HISTORY_LIMIT = 60;
export const DREAM_RETENTION_DAYS = 365;

const ALLOWED_THEMES = new Set(["pursuit", "falling", "water", "travel", "schoolWork", "relationship", "homeFamily", "trappedLost", "bodyExposure", "deathLoss", "general"]);

export class DreamHistoryValidationError extends Error {
  constructor(message, code = "INVALID_DREAM_HISTORY") {
    super(message);
    this.name = "DreamHistoryValidationError";
    this.code = code;
  }
}

function cleanStringArray(value, limit = 10) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, limit).map((item) => String(item || "").trim()).filter(Boolean);
}

function storedDreamResult(result, velaSpeech) {
  const speech = speechRecordForStorage(velaSpeech);
  return speech ? { ...result, _velaSpeech: speech } : result;
}

export function normalizeDreamExtraction(input) {
  const themes = cleanStringArray(input?.themes, 5).filter((theme) => ALLOWED_THEMES.has(theme));
  return {
    people: cleanStringArray(input?.people, 8),
    places: cleanStringArray(input?.places, 8),
    objects: cleanStringArray(input?.objects, 10),
    actions: cleanStringArray(input?.actions, 10),
    emotions: cleanStringArray(input?.emotions, 8),
    themes: themes.length ? themes : ["general"],
    notableImages: cleanStringArray(input?.notableImages, 8),
    summary: String(input?.summary || "").trim().slice(0, 1200),
  };
}

export function normalizeDreamHistorySnapshot(input) {
  if (input?.kind !== "dream" || input?.sourceGrounded !== true) {
    throw new DreamHistoryValidationError("這不是可保存的來源型夢境解讀。", "INVALID_DREAM_KIND");
  }

  let normalized;
  try {
    normalized = normalizeDreamRequest({
      dreamText: input?.dreamText,
      wakingLifeContext: input?.wakingLifeContext,
      requestId: input?.requestId,
    });
  } catch (error) {
    throw new DreamHistoryValidationError(error.message, error.code || "INVALID_DREAM_HISTORY");
  }

  const expectedId = dreamReadingId(normalized);
  if (input?.readingId !== expectedId) {
    throw new DreamHistoryValidationError("夢境紀錄與原始請求不一致。", "DREAM_HISTORY_MISMATCH");
  }

  const extraction = normalizeDreamExtraction(input?.extraction);
  const evidence = evidenceForDreamExtraction(extraction);
  let result;
  try {
    result = normalizeDreamOutput(input?.result, evidence.map((item) => item.id));
  } catch (error) {
    throw new DreamHistoryValidationError(error.message, error.code || "INVALID_DREAM_RESULT");
  }

  return {
    readingId: expectedId,
    requestId: normalized.requestId,
    dreamText: normalized.dreamText,
    wakingLifeContext: normalized.wakingLifeContext,
    extraction,
    result: storedDreamResult(result, input?.velaSpeech),
    sources: publicDreamEvidence(evidence),
    sourceGrounded: true,
    disclaimer: String(input?.disclaimer || "").trim(),
  };
}

export function dreamHistoryRowToSummary(row) {
  return {
    kind: "dream",
    readingId: row.id,
    title: String(row.extraction?.summary || row.dream_text || "夢境解讀").slice(0, 90),
    overview: String(row.reading_result?._velaSpeech?.overview || row.reading_result?.overview || "這次夢境解讀已保存。"),
    themeCount: Array.isArray(row.extraction?.themes) ? row.extraction.themes.length : 0,
    updatedAt: row.updated_at,
    expiresAt: row.expires_at,
  };
}

export function dreamHistoryRowToSnapshot(row) {
  const extraction = normalizeDreamExtraction(row.extraction);
  const evidence = evidenceForDreamExtraction(extraction);
  const stored = row.reading_result || {};
  const result = normalizeDreamOutput(stored, evidence.map((item) => item.id));
  const velaSpeech = speechRecordForStorage(stored._velaSpeech);
  return {
    kind: "dream",
    readingId: row.id,
    requestId: row.request_id,
    dreamText: row.dream_text,
    wakingLifeContext: row.waking_life_context || "",
    extraction,
    result,
    ...(velaSpeech ? { velaSpeech } : {}),
    sources: publicDreamEvidence(evidence),
    sourceGrounded: true,
    disclaimer: row.disclaimer || "",
  };
}
