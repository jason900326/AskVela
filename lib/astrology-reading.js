import { createHash } from "node:crypto";
import { getOpenAI, CHAT_MODEL } from "./openai.js";
import { buildAstrologySkyContext } from "./astrology-sky.js";
import { buildAstrologyInput, buildAstrologyInstructions, ASTROLOGY_READING_SCHEMA } from "./astrology-prompts.js";
import { getZodiacSign, publicZodiacSign } from "./zodiac.js";

const PERIODS = new Set(["daily", "weekly"]);
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{8,160}$/u;

export class AstrologyValidationError extends Error {
  constructor(message, code = "INVALID_ASTROLOGY_REQUEST") {
    super(message);
    this.name = "AstrologyValidationError";
    this.code = code;
  }
}

export class AstrologyOutputError extends Error {
  constructor(message = "Vela 沒有回傳有效的星座解讀。") {
    super(message);
    this.name = "AstrologyOutputError";
    this.code = "INVALID_ASTROLOGY_OUTPUT";
  }
}

function validLocalDate(value) {
  if (!DATE_PATTERN.test(String(value || ""))) return false;
  const [year, month, day] = String(value).split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function normalizeAstrologyRequest(input) {
  const signId = String(input?.signId || "").toLowerCase();
  const sign = getZodiacSign(signId);
  if (!sign) throw new AstrologyValidationError("請先選擇星座。", "INVALID_SIGN");

  const period = String(input?.period || "daily").toLowerCase();
  if (!PERIODS.has(period)) throw new AstrologyValidationError("運勢週期只支援今日或本週。", "INVALID_PERIOD");

  const localDate = String(input?.localDate || "");
  if (!validLocalDate(localDate)) throw new AstrologyValidationError("日期格式不正確。", "INVALID_LOCAL_DATE");

  const timezone = String(input?.timezone || "UTC").trim();
  if (!timezone || timezone.length > 100) throw new AstrologyValidationError("時區格式不正確。", "INVALID_TIMEZONE");

  const requestId = String(input?.requestId || "").trim();
  if (!REQUEST_ID_PATTERN.test(requestId)) throw new AstrologyValidationError("請重新整理頁面後再試一次。", "INVALID_REQUEST_ID");

  return { sign, signId, period, localDate, timezone, requestId };
}

export function astrologyReadingId({ signId, period, localDate, requestId }) {
  const digest = createHash("sha256")
    .update(`${signId}|${period}|${localDate}|${requestId}`)
    .digest("hex")
    .slice(0, 32);
  return `astro_${digest}`;
}

export function normalizeAstrologyOutput(value) {
  if (!value || typeof value !== "object") throw new AstrologyOutputError();
  const textFields = ["overview", "overall", "relationships", "workStudy", "energy", "reflectionQuestion", "basisNote"];
  for (const field of textFields) {
    if (!String(value[field] || "").trim()) throw new AstrologyOutputError(`星座解讀缺少 ${field}。`);
  }
  if (!Array.isArray(value.practicalGuidance) || value.practicalGuidance.length !== 3
    || value.practicalGuidance.some((item) => !String(item || "").trim())) {
    throw new AstrologyOutputError("星座解讀缺少三項可行動建議。");
  }
  return {
    overview: String(value.overview).trim(),
    overall: String(value.overall).trim(),
    relationships: String(value.relationships).trim(),
    workStudy: String(value.workStudy).trim(),
    energy: String(value.energy).trim(),
    practicalGuidance: value.practicalGuidance.map((item) => String(item).trim()),
    reflectionQuestion: String(value.reflectionQuestion).trim(),
    basisNote: String(value.basisNote).trim(),
  };
}

export async function createAstrologyReading(input, { openai = null, model = CHAT_MODEL } = {}) {
  const normalized = normalizeAstrologyRequest(input);
  const skyContext = buildAstrologySkyContext(normalized);
  const client = openai || getOpenAI();
  const response = await client.responses.create({
    model,
    instructions: buildAstrologyInstructions(),
    input: buildAstrologyInput({ ...normalized, skyContext }),
    text: {
      format: {
        type: "json_schema",
        name: "askvela_astrology_reading",
        strict: true,
        schema: ASTROLOGY_READING_SCHEMA,
      },
    },
  });

  let parsed;
  try {
    parsed = JSON.parse(response.output_text || "");
  } catch {
    throw new AstrologyOutputError();
  }

  return {
    kind: "astrology",
    readingId: astrologyReadingId(normalized),
    sign: publicZodiacSign(normalized.sign),
    period: normalized.period,
    localDate: normalized.localDate,
    timezone: normalized.timezone,
    skyContext,
    requestId: normalized.requestId,
    result: normalizeAstrologyOutput(parsed),
    disclaimer: "星座解讀提供的是象徵性反思與娛樂性參考，不保證事件發生，也不取代醫療、法律、財務或其他專業判斷。",
  };
}
