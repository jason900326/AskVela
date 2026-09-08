import { getOpenAI, CHAT_MODEL } from "./openai.js";

const DREAM_FOLLOW_UP_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["response", "changedAngle"],
  properties: {
    response: { type: "string" },
    changedAngle: { type: "string" },
  },
};

function clean(value, max = 1600) {
  return String(value || "").normalize("NFC").trim().slice(0, max);
}

export async function createDreamFollowUp(body, { openai = null, model = CHAT_MODEL } = {}) {
  const dreamText = clean(body?.dreamText, 4000);
  const question = clean(body?.question, 500);
  const userAnswer = clean(body?.userAnswer, 1200);
  const originalOverview = clean(body?.originalOverview, 800);
  const originalInterpretation = clean(body?.originalInterpretation, 1800);
  const wakingLifeConnection = clean(body?.wakingLifeConnection, 1200);

  if (!dreamText || !question || !userAnswer) throw new Error("夢境補充內容不完整。");

  const client = openai || getOpenAI();
  const response = await client.responses.create({
    model,
    max_output_tokens: 650,
    instructions: [
      "你是 Vela，正在延續同一次夢境解讀。請使用自然的台灣繁體中文。",
      "使用者剛回答了你先前針對夢中具體細節提出的一個問題。不要重新寫完整夢境分析，只補充 2–4 句。",
      "必須清楚說明這個回答是否讓原本某個解讀角度變得更強、變弱，或需要改看另一個方向。",
      "不能把夢當預兆、診斷或他人意圖的證據；不能補使用者沒有說過的現實事件。",
      "response 像 Vela 直接接住使用者回答後說的話。changedAngle 用一句很短的標籤，例如『這讓我更在意失去支撐的感覺』。",
    ].join("\n"),
    input: JSON.stringify({
      dreamText,
      originalReading: {
        overview: originalOverview,
        mainInterpretation: originalInterpretation,
        wakingLifeConnection,
      },
      velaQuestion: question,
      userAnswer,
    }),
    text: {
      format: {
        type: "json_schema",
        name: "askvela_dream_follow_up",
        strict: true,
        schema: DREAM_FOLLOW_UP_SCHEMA,
      },
    },
  });

  let parsed;
  try {
    parsed = JSON.parse(response.output_text || "");
  } catch {
    throw new Error("Vela 這次沒有整理出可顯示的補充解讀。");
  }

  const result = {
    response: clean(parsed?.response, 1200),
    changedAngle: clean(parsed?.changedAngle, 240),
  };
  if (!result.response || !result.changedAngle) throw new Error("Vela 這次沒有整理出可顯示的補充解讀。");
  return result;
}
