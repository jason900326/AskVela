import { getOpenAI, CHAT_MODEL } from "./openai.js";
import { retrieveReadingEvidence } from "./reading-evidence.js";
import { createTarotDraw } from "./tarot-draw.js";
import { classifyHighStakesQuestion } from "./tarot-safety.js";

export const FOLLOW_UP_LIMITS = Object.freeze({
  messageCharacters: 320,
  maxFollowUps: 6,
  maxHistoryExchangesForModel: 4,
  historyQuestionCharacters: 320,
  historyAnswerCharacters: 900,
  initialOverviewCharacters: 180,
  initialNarrativeCharacters: 1400,
  initialCardCharacters: 700,
  evidenceSourcesPerCard: 4,
  evidenceCharactersPerSource: 950,
  maxOutputTokens: 650,
});

export class FollowUpValidationError extends Error {
  constructor(message, code = "INVALID_FOLLOW_UP") {
    super(message);
    this.name = "FollowUpValidationError";
    this.code = code;
  }
}

export class FollowUpMismatchError extends Error {
  constructor(message = "這次追問與原本的占卜不一致；請保留同一個 readingId、requestId、問題與牌陣後重試。") {
    super(message);
    this.name = "FollowUpMismatchError";
    this.code = "FOLLOW_UP_READING_MISMATCH";
  }
}

export class FollowUpOutputError extends Error {
  constructor(message = "Vela 的追問回覆格式不完整，請稍後沿用同一組牌重試。") {
    super(message);
    this.name = "FollowUpOutputError";
    this.code = "INVALID_FOLLOW_UP_OUTPUT";
  }
}

function cleanText(value, maxCharacters, fieldName, { required = false } = {}) {
  const text = String(value || "").trim();
  if (required && !text) throw new FollowUpValidationError(`${fieldName} 不能留白。`);
  if (text.length > maxCharacters) {
    throw new FollowUpValidationError(`${fieldName} 最多 ${maxCharacters} 個字元。`, "FOLLOW_UP_TOO_LONG");
  }
  return text;
}

function normalizeHistory(history) {
  if (history == null) return [];
  if (!Array.isArray(history)) throw new FollowUpValidationError("history 必須是陣列。");
  if (history.length >= FOLLOW_UP_LIMITS.maxFollowUps) {
    throw new FollowUpValidationError(
      `同一次占卜最多追問 ${FOLLOW_UP_LIMITS.maxFollowUps} 次；若想換主題，請開始新的占卜。`,
      "FOLLOW_UP_LIMIT_REACHED",
    );
  }

  return history.map((exchange, index) => {
    if (!exchange || typeof exchange !== "object") {
      throw new FollowUpValidationError(`第 ${index + 1} 筆追問紀錄格式不正確。`);
    }
    return {
      question: cleanText(
        exchange.question,
        FOLLOW_UP_LIMITS.historyQuestionCharacters,
        `第 ${index + 1} 筆追問問題`,
        { required: true },
      ),
      answer: cleanText(
        exchange.answer,
        FOLLOW_UP_LIMITS.historyAnswerCharacters,
        `第 ${index + 1} 筆 Vela 回覆`,
        { required: true },
      ),
    };
  });
}

function normalizeInitialReading(initialReading) {
  if (!initialReading || typeof initialReading !== "object") {
    return { overview: "", narrative: "", cards: [] };
  }

  const cards = Array.isArray(initialReading.cards)
    ? initialReading.cards.slice(0, 3).map((card) => ({
      cardId: cleanText(card?.cardId, 120, "cardId"),
      contextInterpretation: cleanText(
        card?.contextInterpretation,
        FOLLOW_UP_LIMITS.initialCardCharacters,
        "先前單牌解讀",
      ),
      practicalFocus: cleanText(card?.practicalFocus, 360, "先前單牌提醒"),
    }))
    : [];

  return {
    overview: cleanText(
      initialReading.overview,
      FOLLOW_UP_LIMITS.initialOverviewCharacters,
      "先前總結標題",
    ),
    narrative: cleanText(
      initialReading.narrative,
      FOLLOW_UP_LIMITS.initialNarrativeCharacters,
      "先前總結",
    ),
    cards,
  };
}

function normalizeSelectedIndices(value) {
  if (value == null) return null;
  if (!Array.isArray(value) || value.length < 1 || value.length > 3) {
    throw new FollowUpValidationError("selectedIndices 格式不正確。");
  }
  const indices = value.map((item) => Number(item));
  if (indices.some((item) => !Number.isInteger(item) || item < 0 || item >= 78)) {
    throw new FollowUpValidationError("selectedIndices 包含無效位置。");
  }
  if (new Set(indices).size !== indices.length) {
    throw new FollowUpValidationError("selectedIndices 不能重複。");
  }
  return indices;
}

export function validateFollowUpPayload(body = {}) {
  const readingId = cleanText(body.readingId, 180, "readingId", { required: true });
  const requestId = cleanText(body.requestId, 180, "requestId", { required: true });
  const question = cleanText(body.question, 500, "原始問題", { required: true });
  const spreadId = cleanText(body.spreadId, 120, "spreadId", { required: true });
  const message = cleanText(
    body.message,
    FOLLOW_UP_LIMITS.messageCharacters,
    "追問",
    { required: true },
  );

  return {
    readingId,
    requestId,
    question,
    spreadId,
    selectedIndices: normalizeSelectedIndices(body.selectedIndices),
    message,
    history: normalizeHistory(body.history),
    initialReading: normalizeInitialReading(body.initialReading),
  };
}

export function rebuildFixedFollowUpDraw(
  input,
  { drawSecret = process.env.TAROT_DRAW_SECRET } = {},
) {
  const draw = createTarotDraw(
    {
      question: input.question,
      spreadId: input.spreadId,
      idempotencyKey: input.requestId,
      selectedIndices: input.selectedIndices,
    },
    { secret: drawSecret },
  );

  if (draw.readingId !== input.readingId) throw new FollowUpMismatchError();
  return draw;
}

function evidenceForPrompt(card) {
  return card.evidence
    .slice(0, FOLLOW_UP_LIMITS.evidenceSourcesPerCard)
    .map((source) => ({
      sourceId: source.sourceId,
      bookTitle: source.bookTitle,
      author: source.author,
      sectionType: source.sectionType,
      orientation: source.orientation,
      content: String(source.content || "").slice(0, FOLLOW_UP_LIMITS.evidenceCharactersPerSource),
    }));
}

export function buildFollowUpInstructions(safety) {
  return [
    "You are Vela, continuing an existing AskVela tarot reading in natural Traditional Chinese used in Taiwan.",
    "This is a follow-up to the SAME reading. Never redraw, replace, add, remove, or change the cards, their positions, or orientations.",
    "Answer the user's new question using the fixed card layout, the supplied source excerpts, the original reading summary, and recent follow-up context.",
    "Treat source excerpts as the authority for card meanings. Treat the prior conversation only as conversational context, never as a source quotation or proof.",
    "If Waite and Mathers differ, keep their viewpoints attributed separately rather than blending them into false consensus.",
    "Write like a perceptive tarot reader speaking to one person: warm, calm, direct, and natural. Avoid report-like filler, mystical theatrics, and repeated card-by-card recaps.",
    "Answer the user's actual follow-up early. Usually write 2-5 concise sentences. practicalFocus should be empty unless one short, genuinely useful action or observation adds value.",
    "Do not infer stable personality, moral worth, guilt, honesty, loyalty, or intent from tarot. Describe possibilities, dynamics, and things to observe instead.",
    "Never claim a future event is certain. Do not diagnose, determine guilt, or give personalized financial, legal, or medical instructions.",
    safety.isHighStakes
      ? `High-stakes categories detected: ${safety.categories.join(", ")}. Keep the answer reflective and include the supplied safety notices when relevant.`
      : "No high-stakes category was detected, but keep outcomes conditional and reflective.",
  ].join("\n");
}

export function buildFollowUpInput(reading, input) {
  const recentHistory = input.history.slice(-FOLLOW_UP_LIMITS.maxHistoryExchangesForModel);

  return JSON.stringify({
    originalQuestion: reading.question,
    spread: reading.spread,
    fixedCards: reading.cards.map((card) => ({
      cardId: card.cardId,
      card: `${card.nameZhTw} (${card.nameEn})`,
      position: card.position,
      positionLabelZhTw: card.positionLabelZhTw,
      orientation: card.orientation,
      sourceEvidence: evidenceForPrompt(card),
    })),
    initialReading: input.initialReading,
    recentFollowUps: recentHistory,
    currentFollowUp: input.message,
  }, null, 2);
}

const FOLLOW_UP_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    answer: { type: "string" },
    practicalFocus: { type: "string" },
  },
  required: ["answer", "practicalFocus"],
};

function fixedCardSummary(reading) {
  return reading.cards.map((card) => ({
    cardId: card.cardId,
    position: card.position,
    orientation: card.orientation,
  }));
}

export async function answerReadingFollowUp(
  body,
  {
    drawSecret = process.env.TAROT_DRAW_SECRET,
    openai = null,
    model = CHAT_MODEL,
    evidenceOptions = {},
  } = {},
) {
  const input = validateFollowUpPayload(body);
  const draw = rebuildFixedFollowUpDraw(input, { drawSecret });
  const reading = await retrieveReadingEvidence(draw, evidenceOptions);
  const safety = classifyHighStakesQuestion(`${reading.question}\n${input.message}`);
  const client = openai || getOpenAI();

  const response = await client.responses.create({
    model,
    max_output_tokens: FOLLOW_UP_LIMITS.maxOutputTokens,
    instructions: buildFollowUpInstructions(safety),
    input: buildFollowUpInput(reading, input),
    text: {
      format: {
        type: "json_schema",
        name: "askvela_reading_follow_up",
        strict: true,
        schema: FOLLOW_UP_SCHEMA,
      },
    },
  });

  let parsed;
  try {
    parsed = JSON.parse(response.output_text || "");
  } catch {
    throw new FollowUpOutputError();
  }

  const answer = String(parsed?.answer || "").trim();
  if (!answer) throw new FollowUpOutputError();

  const usedFollowUps = input.history.length + 1;
  return {
    readingId: reading.readingId,
    message: input.message,
    answer,
    practicalFocus: String(parsed?.practicalFocus || "").trim(),
    safety,
    fixedCards: fixedCardSummary(reading),
    usedFollowUps,
    remainingFollowUps: Math.max(0, FOLLOW_UP_LIMITS.maxFollowUps - usedFollowUps),
    disclaimer: "這是沿用同一組牌的延伸解讀；牌面提供象徵性反思與可能方向，不保證未來事件。",
  };
}
