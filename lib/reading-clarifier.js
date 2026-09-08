import { createHmac } from "node:crypto";
import { getOpenAI, CHAT_MODEL } from "./openai.js";
import { retrieveReadingEvidence, toHumanSourceReference } from "./reading-evidence.js";
import { TAROT_CARDS } from "./tarot-cards.js";
import { createTarotDraw, TAROT_SELECTION_POOL_SIZE } from "./tarot-draw.js";
import { classifyHighStakesQuestion } from "./tarot-safety.js";

export const TAROT_CLARIFIER_LIMIT = 2;
export const TAROT_CLARIFIER_POOL_SIZE = 6;

export class ClarifierValidationError extends Error {
  constructor(message, code = "INVALID_CLARIFIER_REQUEST") {
    super(message);
    this.name = "ClarifierValidationError";
    this.code = code;
  }
}

export class ClarifierMismatchError extends Error {
  constructor(message = "補充抽牌與原本的占卜不一致；請沿用同一個 readingId、requestId、問題與牌陣。") {
    super(message);
    this.name = "ClarifierMismatchError";
    this.code = "CLARIFIER_READING_MISMATCH";
  }
}

export class ClarifierOutputError extends Error {
  constructor(message = "Vela 這次沒有整理出可顯示的補充牌解讀。") {
    super(message);
    this.name = "ClarifierOutputError";
    this.code = "INVALID_CLARIFIER_OUTPUT";
  }
}

function cleanText(value, maxCharacters, label, { required = false } = {}) {
  const text = String(value || "").normalize("NFC").trim();
  if (required && !text) throw new ClarifierValidationError(`${label}不能留白。`);
  if (text.length > maxCharacters) throw new ClarifierValidationError(`${label}最多 ${maxCharacters} 個字元。`);
  return text;
}

function normalizeIndexes(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 3) {
    throw new ClarifierValidationError("選牌紀錄格式不正確。");
  }
  const indexes = value.map(Number);
  if (indexes.some((index) => !Number.isInteger(index) || index < 0 || index >= TAROT_SELECTION_POOL_SIZE)) {
    throw new ClarifierValidationError("選牌紀錄超出可用範圍。");
  }
  if (new Set(indexes).size !== indexes.length) {
    throw new ClarifierValidationError("選牌紀錄包含重複位置。");
  }
  return indexes;
}

function normalizeClarifierCount(value) {
  const count = Number(value || 0);
  if (!Number.isInteger(count) || count < 0 || count >= TAROT_CLARIFIER_LIMIT) {
    throw new ClarifierValidationError(`同一次占卜最多補 ${TAROT_CLARIFIER_LIMIT} 張牌。`, "CLARIFIER_LIMIT_REACHED");
  }
  return count;
}

function normalizeClarifierSlots(value, count) {
  if (!Array.isArray(value) || value.length !== count + 1) {
    throw new ClarifierValidationError("請先從補充牌中選一張。", "INVALID_CLARIFIER_SELECTION");
  }
  const slots = value.map(Number);
  if (slots.some((slot) => !Number.isInteger(slot) || slot < 0 || slot >= TAROT_CLARIFIER_POOL_SIZE)) {
    throw new ClarifierValidationError("補充牌選擇超出可用範圍。", "INVALID_CLARIFIER_SELECTION");
  }
  return slots;
}

function normalizeInitialReading(value) {
  if (!value || typeof value !== "object") return { overview: "", narrative: "", cards: [] };
  return {
    overview: cleanText(value.overview, 220, "原本總結"),
    narrative: cleanText(value.narrative, 1800, "原本解讀"),
    cards: Array.isArray(value.cards)
      ? value.cards.slice(0, 3).map((card) => ({
        cardId: cleanText(card?.cardId, 120, "cardId"),
        contextInterpretation: cleanText(card?.contextInterpretation, 760, "原本單牌解讀"),
        practicalFocus: cleanText(card?.practicalFocus, 420, "原本單牌提醒"),
      }))
      : [],
  };
}

function validatePayload(body = {}) {
  const clarifierCount = normalizeClarifierCount(body.clarifierCount);
  return {
    readingId: cleanText(body.readingId, 180, "readingId", { required: true }),
    requestId: cleanText(body.requestId, 200, "requestId", { required: true }),
    question: cleanText(body.question, 500, "問題", { required: true }),
    spreadId: cleanText(body.spreadId, 120, "spreadId", { required: true }),
    selectedCardIndexes: normalizeIndexes(body.selectedCardIndexes),
    clarifierCount,
    clarifierSlots: normalizeClarifierSlots(body.clarifierSlots, clarifierCount),
    initialReading: normalizeInitialReading(body.initialReading),
  };
}

function orderedCandidates(cards, { secret, readingId, ordinal }) {
  return cards
    .map((card) => ({
      card,
      digest: createHmac("sha256", secret).update(`clarifier-pool:${readingId}:${ordinal}:${card.card_id}`).digest("hex"),
    }))
    .sort((left, right) => left.digest.localeCompare(right.digest))
    .map((item) => item.card);
}

function chooseClarifier({ fixedDraw, selectionSlots, secret }) {
  const used = new Set(fixedDraw.cards.map((card) => card.cardId));
  let chosen = null;

  selectionSlots.forEach((slot, index) => {
    const ordinal = index + 1;
    const candidates = TAROT_CARDS.filter((card) => !used.has(card.card_id));
    const pool = orderedCandidates(candidates, { secret, readingId: fixedDraw.readingId, ordinal }).slice(0, TAROT_CLARIFIER_POOL_SIZE);
    const card = pool[slot];
    if (!card) throw new ClarifierValidationError("這張補充牌目前無法使用，請再選一次。", "INVALID_CLARIFIER_SELECTION");
    const orientationDigest = createHmac("sha256", secret)
      .update(`clarifier-orientation:${fixedDraw.readingId}:${ordinal}:${slot}`)
      .digest();
    const orientation = orientationDigest.readUInt32BE(0) % 2 === 0 ? "upright" : "reversed";
    used.add(card.card_id);
    chosen = { card, orientation, ordinal, selectionSlot: slot };
  });

  return chosen;
}

function evidenceForPrompt(card) {
  return card.evidence.slice(0, 6).map((source) => ({
    sourceId: source.sourceId,
    bookTitle: source.bookTitle,
    author: source.author,
    sectionType: source.sectionType,
    orientation: source.orientation,
    content: String(source.content || "").slice(0, 1000),
  }));
}

const CLARIFIER_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    sourceMeaning: { type: "string" },
    interpretation: { type: "string" },
    practicalFocus: { type: "string" },
  },
  required: ["sourceMeaning", "interpretation", "practicalFocus"],
};

function buildClarifierInstructions(safety) {
  return [
    "You are Vela, adding ONE clarifier card to an existing AskVela tarot reading. Write natural Traditional Chinese used in Taiwan.",
    "The user personally chose this face-down clarifier from a six-card pool. Do not say Vela drew it for them.",
    "This new card does not replace, cancel, or overrule the original spread. Its job is only to clarify one unresolved edge of the same question.",
    "sourceMeaning must summarize only the supplied source excerpts for this card and orientation, normally 1-3 concise sentences.",
    "interpretation should connect this clarifier to the original question and the prior reading context in 2-4 conversational sentences.",
    "Do not pretend the clarifier proves a future event. Do not keep drawing conceptually or suggest that more cards always produce more certainty.",
    "If the new card tensions with the original reading, describe the tension instead of forcing agreement.",
    "practicalFocus is one short observation or action only when useful; otherwise return an empty string.",
    "Do not infer stable personality, guilt, honesty, loyalty, medical conditions, or another person's hidden intent from tarot.",
    safety.isHighStakes
      ? `High-stakes categories detected: ${safety.categories.join(", ")}. Keep the clarifier reflective and do not replace qualified professional judgment.`
      : "Keep outcomes conditional and reflective.",
  ].join("\n");
}

export async function drawReadingClarifier(
  body,
  {
    drawSecret = process.env.TAROT_DRAW_SECRET,
    openai = null,
    model = CHAT_MODEL,
    evidenceOptions = {},
  } = {},
) {
  const input = validatePayload(body);
  const fixedDraw = createTarotDraw(
    {
      question: input.question,
      spreadId: input.spreadId,
      idempotencyKey: input.requestId,
      selectedCardIndexes: input.selectedCardIndexes,
    },
    { secret: drawSecret },
  );
  if (fixedDraw.readingId !== input.readingId) throw new ClarifierMismatchError();

  const secret = String(drawSecret || "");
  if (secret.length < 32) throw new Error("TAROT_DRAW_SECRET must contain at least 32 characters.");

  const chosen = chooseClarifier({ fixedDraw, selectionSlots: input.clarifierSlots, secret });
  const positionId = `clarifier-${chosen.ordinal}`;
  const clarifierDraw = {
    readingId: `${fixedDraw.readingId}-${positionId}`,
    question: fixedDraw.question,
    spread: {
      id: "clarifier",
      nameZhTw: "補充牌",
      positions: [{ id: positionId, labelZhTw: `補充牌 ${chosen.ordinal}` }],
    },
    cards: [{
      cardId: chosen.card.card_id,
      nameEn: chosen.card.name_en,
      nameZhTw: chosen.card.name_zh_tw,
      arcana: chosen.card.arcana,
      numberOrRank: chosen.card.number_or_rank,
      ...(chosen.card.suit ? { suit: chosen.card.suit } : {}),
      position: positionId,
      positionLabelZhTw: `補充牌 ${chosen.ordinal}`,
      orientation: chosen.orientation,
    }],
  };

  const grounded = await retrieveReadingEvidence(clarifierDraw, evidenceOptions);
  const card = grounded.cards[0];
  const safety = classifyHighStakesQuestion(fixedDraw.question);
  const client = openai || getOpenAI();
  const response = await client.responses.create({
    model,
    max_output_tokens: 650,
    instructions: buildClarifierInstructions(safety),
    input: JSON.stringify({
      originalQuestion: fixedDraw.question,
      originalSpread: fixedDraw.spread,
      originalCards: fixedDraw.cards.map((item) => ({
        cardId: item.cardId,
        card: `${item.nameZhTw} (${item.nameEn})`,
        positionLabelZhTw: item.positionLabelZhTw,
        orientation: item.orientation,
      })),
      originalReading: input.initialReading,
      clarifier: {
        ordinal: chosen.ordinal,
        selectedByUser: true,
        selectionSlot: chosen.selectionSlot,
        cardId: card.cardId,
        card: `${card.nameZhTw} (${card.nameEn})`,
        orientation: card.orientation,
        sourceEvidence: evidenceForPrompt(card),
      },
    }, null, 2),
    text: {
      format: {
        type: "json_schema",
        name: "askvela_tarot_clarifier",
        strict: true,
        schema: CLARIFIER_SCHEMA,
      },
    },
  });

  let parsed;
  try {
    parsed = JSON.parse(response.output_text || "");
  } catch {
    throw new ClarifierOutputError();
  }

  const sourceMeaning = String(parsed?.sourceMeaning || "").trim();
  const interpretation = String(parsed?.interpretation || "").trim();
  if (!sourceMeaning || !interpretation) throw new ClarifierOutputError();

  return {
    ordinal: chosen.ordinal,
    selectionSlot: chosen.selectionSlot,
    card: {
      cardId: card.cardId,
      nameEn: card.nameEn,
      nameZhTw: card.nameZhTw,
      arcana: card.arcana,
      numberOrRank: card.numberOrRank,
      ...(card.suit ? { suit: card.suit } : {}),
      orientation: card.orientation,
    },
    sourceMeaning,
    interpretation,
    practicalFocus: String(parsed?.practicalFocus || "").trim(),
    sources: card.evidence.map(toHumanSourceReference),
    usedClarifiers: chosen.ordinal,
    remainingClarifiers: Math.max(0, TAROT_CLARIFIER_LIMIT - chosen.ordinal),
    disclaimer: "這是一張你自己選的補充牌，用來釐清原本牌面的某個角度，不會取代或重算前面的牌陣。",
  };
}
