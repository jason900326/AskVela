import { astrologyReadingId, normalizeAstrologyOutput, normalizeAstrologyRequest } from "./astrology-reading.js";
import { buildAstrologySkyContext } from "./astrology-sky.js";
import { publicZodiacSign } from "./zodiac.js";

export const ASTROLOGY_HISTORY_LIMIT = 60;
export const ASTROLOGY_RETENTION_DAYS = 365;

export class AstrologyHistoryValidationError extends Error {
  constructor(message, code = "INVALID_ASTROLOGY_HISTORY") {
    super(message);
    this.name = "AstrologyHistoryValidationError";
    this.code = code;
  }
}

function periodLabel(period) {
  return period === "weekly" ? "本週運勢" : "今日運勢";
}

export function normalizeAstrologyHistorySnapshot(input) {
  if (input?.kind !== "astrology") {
    throw new AstrologyHistoryValidationError("這不是可保存的星座解讀。", "INVALID_ASTROLOGY_KIND");
  }

  let normalized;
  try {
    normalized = normalizeAstrologyRequest({
      signId: input?.sign?.id,
      period: input?.period,
      localDate: input?.localDate,
      timezone: input?.timezone,
      requestId: input?.requestId,
    });
  } catch (error) {
    throw new AstrologyHistoryValidationError(error.message, error.code || "INVALID_ASTROLOGY_HISTORY");
  }

  const expectedId = astrologyReadingId(normalized);
  if (input?.readingId !== expectedId) {
    throw new AstrologyHistoryValidationError("星座紀錄與原始請求不一致。", "ASTROLOGY_HISTORY_MISMATCH");
  }

  let result;
  try {
    result = normalizeAstrologyOutput(input?.result);
  } catch (error) {
    throw new AstrologyHistoryValidationError(error.message, error.code || "INVALID_ASTROLOGY_RESULT");
  }

  const skyContext = buildAstrologySkyContext(normalized);
  return {
    readingId: expectedId,
    requestId: normalized.requestId,
    sign: publicZodiacSign(normalized.sign),
    period: normalized.period,
    localDate: normalized.localDate,
    timezone: normalized.timezone,
    skyContext,
    result,
    disclaimer: String(input?.disclaimer || "").trim(),
  };
}

export function astrologyHistoryRowToSummary(row) {
  return {
    kind: "astrology",
    readingId: row.id,
    signId: row.sign_id,
    signNameZhTw: row.sign_name_zh_tw,
    period: row.period,
    periodLabel: periodLabel(row.period),
    localDate: row.local_date,
    overview: String(row.reading_result?.overview || "這次星座解讀已保存。"),
    updatedAt: row.updated_at,
    expiresAt: row.expires_at,
  };
}

export function astrologyHistoryRowToSnapshot(row) {
  return {
    kind: "astrology",
    readingId: row.id,
    requestId: row.request_id,
    sign: row.sign_profile,
    period: row.period,
    localDate: row.local_date,
    timezone: row.timezone,
    skyContext: row.sky_context,
    result: row.reading_result,
    disclaimer: row.disclaimer || "",
  };
}
