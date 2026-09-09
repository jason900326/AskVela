import { getOpenAI, CHAT_MODEL } from "./openai.js";
import { buildVelaSharedVoiceInstructions } from "./vela-voice.js";

export const RETENTION_MAX_TURNS = 6;
export const RETENTION_MAX_MESSAGE_LENGTH = 500;

const CONTINUATION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["answer", "reflectionQuestion"],
  properties: {
    answer: { type: "string" },
    reflectionQuestion: { type: "string" },
  },
};

function clean(value, max) {
  return String(value || "").normalize("NFC").trim().slice(0, max);
}

export function normalizeContinuationMessage(value) {
  const message = clean(value, RETENTION_MAX_MESSAGE_LENGTH);
  if (message.length < 2) throw new Error("至少再告訴 Vela 一點你想接著問的事。");
  return message;
}

export function normalizeContinuationTurns(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(-RETENTION_MAX_TURNS).map((turn) => ({
    question: clean(turn?.question, RETENTION_MAX_MESSAGE_LENGTH),
    answer: clean(turn?.answer, 1600),
    reflectionQuestion: clean(turn?.reflectionQuestion, 500),
    createdAt: clean(turn?.createdAt, 80),
  })).filter((turn) => turn.question && turn.answer);
}

function tarotContext(snapshot) {
  const result = snapshot?.reading_result || {};
  return {
    originalQuestion: snapshot?.question || "",
    spread: snapshot?.spread_name_zh_tw || "",
    cards: (result.cards || []).map((card) => ({
      name: card.nameZhTw,
      position: card.positionLabelZhTw,
      orientation: card.orientation,
      interpretation: card.contextInterpretation,
      practicalFocus: card.practicalFocus,
    })),
    overview: result.synthesis?.overview || "",
    narrative: result.synthesis?.narrative || "",
    crossCardPattern: result.synthesis?.crossCardPattern || "",
    practicalGuidance: result.synthesis?.practicalGuidance || [],
    previousReadingFollowUps: snapshot?.reading_messages || [],
  };
}

function astrologyContext(snapshot) {
  const result = snapshot?.reading_result || {};
  return {
    sign: snapshot?.sign_name_zh_tw || "",
    period: snapshot?.period || "",
    localDate: snapshot?.local_date || "",
    skyContext: snapshot?.sky_context || {},
    overview: result.overview || "",
    overall: result.overall || "",
    workStudy: result.workStudy || "",
    relationships: result.relationships || "",
    energy: result.energy || "",
    focusAreas: result.focusAreas || [],
    practicalGuidance: result.practicalGuidance || [],
  };
}

function dreamContext(snapshot) {
  const result = snapshot?.reading_result || {};
  return {
    dreamText: snapshot?.dream_text || "",
    wakingLifeContext: snapshot?.waking_life_context || "",
    extractedDream: snapshot?.extraction || {},
    overview: result.overview || "",
    whatStandsOut: result.whatStandsOut || [],
    hypotheses: (result.hypotheses || []).map((item) => ({
      title: item.title,
      interpretation: item.interpretation,
    })),
    wakingLifeConnection: result.wakingLifeConnection || "",
    groundingNote: result.groundingNote || "",
  };
}

function contextFor(kind, snapshot) {
  if (kind === "astrology") return astrologyContext(snapshot);
  if (kind === "dream") return dreamContext(snapshot);
  return tarotContext(snapshot);
}

function modeRules(kind) {
  if (kind === "tarot") {
    return [
      "這是使用者主動回到同一次塔羅解讀後的延續對話。只能沿用原本固定的牌、正逆位、牌陣位置、原解讀與已保存追問；不要重抽、不要假裝出現新牌。",
      "使用者若問未來會不會發生某事，可以從原牌面談傾向、條件與值得觀察的變化，但不能把牌變成確定預言。",
    ];
  }
  if (kind === "astrology") {
    return [
      "這是使用者主動回到同一次星座解讀後的延續對話。只能沿用已保存的太陽星座、日期／週期、skyContext 與原解讀；不要新增不存在的行星、逆行、宮位、上升或相位。",
      "不要把太陽星座寫成固定人格，也不要把當次星象說成必然事件。",
    ];
  }
  return [
    "這是使用者主動回到同一次夢境解讀後的延續對話。只能沿用使用者原本描述的夢、現實背景、抽取線索與原解讀；不要替夢補情節，也不要把夢中人物當成現實人物意圖的證據。",
    "夢境只作反思，不做心理／醫療診斷，也不把夢當預兆。",
  ];
}

export async function createRetentionContinuation({
  kind,
  snapshot,
  turns = [],
  message,
}, { openai = null, model = CHAT_MODEL } = {}) {
  if (!["tarot", "astrology", "dream"].includes(kind)) throw new Error("這筆紀錄的類型不支援延續對話。");
  const userMessage = normalizeContinuationMessage(message);
  const previousTurns = normalizeContinuationTurns(turns);
  if (previousTurns.length >= RETENTION_MAX_TURNS) {
    throw new Error("這次先聊到這裡。你可以回到原解讀，或之後用新的閱讀再看看。 ");
  }

  const client = openai || getOpenAI();
  const response = await client.responses.create({
    model,
    max_output_tokens: 850,
    instructions: [
      buildVelaSharedVoiceInstructions(),
      "你正在『我的紀錄』裡延續一筆使用者自己主動打開的舊解讀。不要提到你有長期記憶，也不要假裝知道這筆紀錄之外的舊聊天。",
      "直接接住使用者現在問的這一句，通常回答 2–5 句即可；需要時可以引用原解讀的一個具體細節，讓人知道你確實是在延續這一次，而不是重新生成泛用答案。",
      "不要重寫整篇原解讀，不要重新總結所有區塊。只有和新問題直接相關的舊內容才帶進來。",
      "不要出現 Waite、Mathers、Freud、書名、來源 ID、schema、prompt、檢索欄位或其他內部資料名稱。使用者聽到的應該只有 Vela。",
      "不得確定預言、診斷、斷定第三人內心意圖，也不得用占卜／星象／夢境替代醫療、法律、投資或安全上的專業判斷。",
      "reflectionQuestion 是可選延伸：只有一個真的尚未解開、而且回答後會改變理解的細節時才問一句；不需要追問就回傳空字串。不要為了留存或互動率硬問。",
      ...modeRules(kind),
    ].join("\n"),
    input: JSON.stringify({
      mode: kind,
      savedReadingContext: contextFor(kind, snapshot),
      continuationHistory: previousTurns.map((turn) => ({
        user: turn.question,
        vela: turn.answer,
        ...(turn.reflectionQuestion ? { velaQuestion: turn.reflectionQuestion } : {}),
      })),
      userMessage,
    }, null, 2),
    text: {
      format: {
        type: "json_schema",
        name: "askvela_retention_continuation",
        strict: true,
        schema: CONTINUATION_SCHEMA,
      },
    },
  });

  let parsed;
  try {
    parsed = JSON.parse(response.output_text || "");
  } catch {
    throw new Error("Vela 這次沒有整理出可顯示的回答。");
  }

  const answer = clean(parsed?.answer, 1600);
  const reflectionQuestion = clean(parsed?.reflectionQuestion, 500);
  if (!answer) throw new Error("Vela 這次沒有整理出可顯示的回答。");

  return {
    question: userMessage,
    answer,
    reflectionQuestion,
    createdAt: new Date().toISOString(),
  };
}
