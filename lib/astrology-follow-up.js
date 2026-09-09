import { getOpenAI, CHAT_MODEL } from "./openai.js";

const ASTROLOGY_FOLLOW_UP_SCHEMA = {
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

export async function createAstrologyFollowUp(body, { openai = null, model = CHAT_MODEL } = {}) {
  const signName = clean(body?.signName, 80);
  const periodLabel = clean(body?.periodLabel, 40);
  const localDate = clean(body?.localDate, 40);
  const question = clean(body?.question, 500);
  const userAnswer = clean(body?.userAnswer, 1200);
  const headline = clean(body?.headline, 800);
  const overall = clean(body?.overall, 1600);
  const workStudy = clean(body?.workStudy, 1200);
  const relationships = clean(body?.relationships, 1200);
  const focusAreas = Array.isArray(body?.focusAreas)
    ? body.focusAreas.slice(0, 2).map((item) => ({ title: clean(item?.title, 120), body: clean(item?.body, 1000) }))
    : [];
  const skySignals = Array.isArray(body?.skySignals)
    ? body.skySignals.slice(0, 8).map((item) => clean(item, 500)).filter(Boolean)
    : [];

  if (!signName || !question || !userAnswer || !headline) {
    throw new Error("星座補充內容不完整。");
  }

  const client = openai || getOpenAI();
  const response = await client.responses.create({
    model,
    max_output_tokens: 650,
    instructions: [
      "你是 Vela，正在延續同一次星座解讀。請使用自然的台灣繁體中文。",
      "使用者剛回答了你在原本星座解讀裡主動提出的一個問題。這次只回應一次，不要再提出第二個問題。",
      "不要重新寫完整星座運勢，只補充 2–4 句：說明這個回答讓原本哪個角度更明顯、變弱，或值得換一個角度理解。",
      "只能沿用原本已提供的解讀與天象訊號；不要虛構新的行星位置、相位、出生資訊或生活事件。",
      "不要把占星說成確定命運。描述可能的節奏、傾向與可觀察的事情。",
      "response 要像 Vela 直接接住使用者回答後說的話。changedAngle 是一句很短的標籤，例如『這讓我更在意你對節奏的掌控感』。",
    ].join("\n"),
    input: JSON.stringify({
      signName,
      periodLabel,
      localDate,
      originalReading: { headline, overall, workStudy, relationships, focusAreas, skySignals },
      velaQuestion: question,
      userAnswer,
    }),
    text: {
      format: {
        type: "json_schema",
        name: "askvela_astrology_follow_up",
        strict: true,
        schema: ASTROLOGY_FOLLOW_UP_SCHEMA,
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
  if (!result.response || !result.changedAngle) {
    throw new Error("Vela 這次沒有整理出可顯示的補充解讀。");
  }
  return result;
}
