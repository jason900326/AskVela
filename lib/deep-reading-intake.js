import { getOpenAI } from "./openai.js";

export const DEEP_READING_SPREAD_ID = "situation-obstacle-advice";
export const DEEP_READING_INTAKE_MODEL = process.env.OPENAI_INTAKE_MODEL || "gpt-5.6-luna";

const INTAKE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    readingTitle: { type: "string" },
    velaLine: { type: "string" },
    clarifyingQuestion: { type: "string" },
    options: {
      type: "array",
      minItems: 2,
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string", enum: ["a", "b", "c"] },
          label: { type: "string" },
          focusQuestion: { type: "string" },
          lenses: {
            type: "array",
            minItems: 3,
            maxItems: 3,
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                label: { type: "string" },
                purpose: { type: "string" },
              },
              required: ["label", "purpose"],
            },
          },
        },
        required: ["id", "label", "focusQuestion", "lenses"],
      },
    },
  },
  required: ["readingTitle", "velaLine", "clarifyingQuestion", "options"],
};

export class DeepReadingIntakeError extends Error {
  constructor(message, code = "INVALID_DEEP_READING_INTAKE") {
    super(message);
    this.name = "DeepReadingIntakeError";
    this.code = code;
  }
}

function cleanText(value, max, label, { required = false } = {}) {
  const text = String(value || "").normalize("NFC").trim();
  if (required && !text) throw new DeepReadingIntakeError(`${label}不能留白。`);
  if (text.length > max) throw new DeepReadingIntakeError(`${label}最多 ${max} 個字元。`);
  return text;
}

function cleanLens(lens, index) {
  return {
    label: cleanText(lens?.label, 26, `第 ${index + 1} 個閱讀位置`, { required: true }),
    purpose: cleanText(lens?.purpose, 90, `第 ${index + 1} 個閱讀位置說明`, { required: true }),
  };
}

function normalizeOutput(parsed) {
  const rawOptions = Array.isArray(parsed?.options) ? parsed.options.slice(0, 3) : [];
  if (rawOptions.length < 2) throw new DeepReadingIntakeError("Vela 這次沒有整理出足夠清楚的方向。", "INVALID_DEEP_READING_OUTPUT");

  const seen = new Set();
  const options = rawOptions.map((option, index) => {
    const id = ["a", "b", "c"].includes(option?.id) ? option.id : ["a", "b", "c"][index];
    if (seen.has(id)) throw new DeepReadingIntakeError("Vela 的釐清選項重複了。", "INVALID_DEEP_READING_OUTPUT");
    seen.add(id);
    const lenses = Array.isArray(option?.lenses) ? option.lenses.slice(0, 3).map(cleanLens) : [];
    if (lenses.length !== 3) throw new DeepReadingIntakeError("Vela 沒有完成三個閱讀位置。", "INVALID_DEEP_READING_OUTPUT");
    return {
      id,
      label: cleanText(option?.label, 34, "釐清選項", { required: true }),
      focusQuestion: cleanText(option?.focusQuestion, 180, "真正要看的問題", { required: true }),
      lenses,
    };
  });

  return {
    readingTitle: cleanText(parsed?.readingTitle, 40, "Reading 標題", { required: true }),
    velaLine: cleanText(parsed?.velaLine, 150, "Vela 的話", { required: true }),
    clarifyingQuestion: cleanText(parsed?.clarifyingQuestion, 120, "釐清問題", { required: true }),
    options,
  };
}

export function buildDeepReadingQuestion({ originalQuestion, focusQuestion, lenses }) {
  const original = cleanText(originalQuestion, 700, "原始描述", { required: true });
  const focus = cleanText(focusQuestion, 180, "真正要看的問題", { required: true });
  if (!Array.isArray(lenses) || lenses.length !== 3) throw new DeepReadingIntakeError("Deep Reading 需要三個閱讀位置。");
  const safeLenses = lenses.map(cleanLens);

  return [
    `使用者原始描述：${original}`,
    `這次真正要看的問題：${focus}`,
    "這次三個閱讀位置請依序理解為：",
    `1. ${safeLenses[0].label}：${safeLenses[0].purpose}`,
    `2. ${safeLenses[1].label}：${safeLenses[1].purpose}`,
    `3. ${safeLenses[2].label}：${safeLenses[2].purpose}`,
    "請把既有三張牌陣的第 1/2/3 個位置分別套用到以上三個閱讀位置；不要自行改題或增加第四個位置。",
  ].join("\n");
}

export async function planDeepReading(question, { openai = null, model = DEEP_READING_INTAKE_MODEL } = {}) {
  const normalizedQuestion = cleanText(question, 700, "問題", { required: true });
  if (normalizedQuestion.length < 8) {
    throw new DeepReadingIntakeError("再多說一點點，Vela 才能分辨你真正卡住的是哪一塊。", "DEEP_READING_TOO_SHORT");
  }

  const client = openai || getOpenAI();
  const response = await client.responses.create({
    model,
    max_output_tokens: 900,
    instructions: [
      "You are the intake planner for AskVela Deep Reading. Write natural Traditional Chinese used in Taiwan.",
      "Your job is NOT to interpret tarot and NOT to predict an outcome. Do not mention cards yet.",
      "Read the user's messy real-life concern and identify the 2-3 genuinely different directions that would change what the reading should investigate.",
      "Ask exactly one high-value clarifying question. Generate 2-3 short button choices that answer that question; do not generate generic feelings or duplicate choices.",
      "Each option must include a focusQuestion that turns the user's concern into one answerable reflective question.",
      "Each option must also define exactly three reading lenses. Lens 1 must examine the current reality/state; lens 2 the central tension, obstacle, or unknown; lens 3 the next decision criterion, observation, or direction. Give these lenses specific labels adapted to the user's situation instead of generic 現況/阻礙/建議 whenever possible.",
      "Do not claim to know another person's hidden feelings, honesty, loyalty, diagnosis, guilt, or future behavior.",
      "For medical, legal, financial, crisis, or other consequential topics, keep the focus reflective and observational; never frame tarot as the deciding authority.",
      "velaLine should briefly show that Vela understood the real tension, without theatrical mysticism or fake hesitation.",
      "readingTitle should be a short neutral title for this issue, not a verdict.",
    ].join("\n"),
    input: normalizedQuestion,
    text: {
      format: {
        type: "json_schema",
        name: "askvela_deep_reading_intake",
        strict: true,
        schema: INTAKE_SCHEMA,
      },
    },
  });

  let parsed;
  try {
    parsed = JSON.parse(response.output_text || "");
  } catch {
    throw new DeepReadingIntakeError("Vela 這次沒有整理好問題，請再試一次。", "INVALID_DEEP_READING_OUTPUT");
  }
  return normalizeOutput(parsed);
}
