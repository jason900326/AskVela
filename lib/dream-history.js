import { buildDreamEvidence, publicDreamEvidence } from "./dream-evidence.js";
import { extractDreamFeatures } from "./dream-extractor.js";
import { dreamReadingId, normalizeDreamOutput, normalizeDreamRequest } from "./dream-reading.js";

export const DREAM_HISTORY_LIMIT = 60;
export const DREAM_RETENTION_DAYS = 365;

export class DreamHistoryValidationError extends Error {
  constructor(message, code = "INVALID_DREAM_HISTORY") {
    super(message);
    this.name = "DreamHistoryValidationError";
    this.code = code;
  }
}

export function normalizeDreamHistorySnapshot(input) {
  if (input?.kind !== "dream" || input?.sourceGrounded !== true) {
    throw new DreamHistoryValidationError("這不是可保存的來源型夢境解讀。", "INVALID_DREAM_KIND");
  }
  let normalized;
  try {
    normalized = normalizeDreamRequest(input);
  } catch (error) {
    throw new DreamHistoryValidationError(error.message, error.code || "INVALID_DREAM_HISTORY");
  }
  const expectedId = dreamReadingId(normalized);
  if (input?.readingId !== expectedId) {
    throw new DreamHistoryValidationError("夢境紀錄與原始請求不一致。", "DREAM_HISTORY_MISMATCH");
  }
  const extracted = extractDreamFeatures(normalized.dreamText);
  const evidence = buildDreamEvidence(extracted);
  if (!evidence.sufficient) {
    throw new DreamHistoryValidationError("這次夢境解讀目前無法重新驗證來源。", "DREAM_SOURCE_MISMATCH");
  }
  let result;
  try {
    result = normalizeDreamOutput(input?.result, new Set(evidence.items.map((item) => item.id)));
  } catch (error) {
    throw new DreamHistoryValidationError(error.message, error.code || "INVALID_DREAM_RESULT");
  }
  return {
    readingId: expectedId,
    requestId: normalized.requestId,
    dreamText: normalized.dreamText,
    contextText: normalized.contextText,
    extracted,
    result,
    sources: publicDreamEvidence(evidence),
    sourceGrounded: true,
    disclaimer: String(input?.disclaimer || "").trim(),
  };
}

export function dreamHistoryRowToSummary(row) {
  const title = String(row.reading_result?.title || "一個夢").trim();
  return {
    kind: "dream",
    readingId: row.id,
    title,
    overview: String(row.reading_result?.dreamSummary || "這次夢境解讀已保存。"),
    dreamPreview: String(row.dream_text || "").slice(0, 90),
    updatedAt: row.updated_at,
    expiresAt: row.expires_at,
  };
}

export function dreamHistoryRowToSnapshot(row) {
  const extracted = extractDreamFeatures(row.dream_text);
  const evidence = buildDreamEvidence(extracted);
  return {
    kind: "dream",
    readingId: row.id,
    requestId: row.request_id,
    dreamText: row.dream_text,
    contextText: row.context_text || "",
    extracted,
    result: row.reading_result,
    sources: publicDreamEvidence(evidence),
    sourceGrounded: evidence.sufficient,
    disclaimer: row.disclaimer || "",
  };
}
