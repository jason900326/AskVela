import { createTarotDraw } from "./tarot-draw.js";

export const READING_RETENTION_DAYS = 365;
export const READING_HISTORY_LIMIT = 50;
const MAX_SNAPSHOT_CHARACTERS = 120_000;
const MAX_FOLLOW_UPS = 6;

export class ReadingHistoryValidationError extends Error {
  constructor(message, code = "INVALID_READING_HISTORY") {
    super(message);
    this.name = "ReadingHistoryValidationError";
    this.code = code;
  }
}

export class ReadingHistoryMismatchError extends Error {
  constructor(message = "要保存的內容與原本固定牌面不一致。") {
    super(message);
    this.name = "ReadingHistoryMismatchError";
    this.code = "READING_HISTORY_MISMATCH";
  }
}

function cleanText(value, maxCharacters, label, { required = false } = {}) {
  const text = String(value || "").normalize("NFC").trim();
  if (required && !text) throw new ReadingHistoryValidationError(`${label}不能留白。`);
  if (text.length > maxCharacters) {
    throw new ReadingHistoryValidationError(`${label}最多 ${maxCharacters} 個字元。`);
  }
  return text;
}

function normalizeIndexes(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 3) {
    throw new ReadingHistoryValidationError("選牌紀錄格式不正確。");
  }
  const indexes = value.map(Number);
  if (indexes.some((index) => !Number.isInteger(index) || index < 0 || index >= 12)) {
    throw new ReadingHistoryValidationError("選牌紀錄超出可用範圍。");
  }
  if (new Set(indexes).size !== indexes.length) {
    throw new ReadingHistoryValidationError("選牌紀錄包含重複位置。");
  }
  return indexes;
}

function cardSignature(cards = []) {
  return cards
    .map((card) => `${card?.cardId}:${card?.position}:${card?.orientation}`)
    .join("|");
}

function normalizeFollowUps(value) {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > MAX_FOLLOW_UPS) {
    throw new ReadingHistoryValidationError(`同一次占卜最多保存 ${MAX_FOLLOW_UPS} 次追問。`);
  }

  return value.map((item, index) => ({
    ordinal: index + 1,
    question: cleanText(item?.question, 320, `第 ${index + 1} 筆追問`, { required: true }),
    answer: cleanText(item?.answer, 1_200, `第 ${index + 1} 筆回答`, { required: true }),
    practicalFocus: cleanText(item?.practicalFocus, 500, `第 ${index + 1} 筆提醒`),
    safety: item?.safety && typeof item.safety === "object"
      ? JSON.parse(JSON.stringify(item.safety))
      : null,
  }));
}

function plainJson(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ReadingHistoryValidationError(`${label}格式不正確。`);
  }
  return JSON.parse(JSON.stringify(value));
}

export function normalizeReadingHistorySnapshot(
  body,
  { drawSecret = process.env.TAROT_DRAW_SECRET } = {},
) {
  let serialized;
  try {
    serialized = JSON.stringify(body);
  } catch {
    throw new ReadingHistoryValidationError("占卜紀錄無法序列化。");
  }
  if (!serialized || serialized.length > MAX_SNAPSHOT_CHARACTERS) {
    throw new ReadingHistoryValidationError("占卜紀錄過大，無法保存。", "READING_HISTORY_TOO_LARGE");
  }

  const readingId = cleanText(body?.readingId, 180, "readingId", { required: true });
  const requestId = cleanText(body?.requestId, 200, "requestId", { required: true });
  const question = cleanText(body?.question, 500, "問題", { required: true });
  const spreadId = cleanText(body?.spreadId, 120, "spreadId", { required: true });
  const selectedCardIndexes = normalizeIndexes(body?.selectedCardIndexes);
  const fixedDraw = createTarotDraw(
    { question, spreadId, idempotencyKey: requestId, selectedCardIndexes },
    { secret: drawSecret },
  );

  if (fixedDraw.readingId !== readingId) throw new ReadingHistoryMismatchError();
  if (cardSignature(body?.draw?.cards) !== cardSignature(fixedDraw.cards)) {
    throw new ReadingHistoryMismatchError("要保存的抽牌結果與伺服器重建的牌面不一致。");
  }

  const result = plainJson(body?.result, "解讀結果");
  if (result.readingId !== readingId || cardSignature(result.cards) !== cardSignature(fixedDraw.cards)) {
    throw new ReadingHistoryMismatchError("要保存的解讀與原本固定牌面不一致。");
  }

  return {
    reading: {
      id: readingId,
      question,
      spread_id: fixedDraw.spread.id,
      spread_name_zh_tw: fixedDraw.spread.nameZhTw,
      request_id: requestId,
      selected_card_indexes: selectedCardIndexes,
      reading_result: result,
    },
    cards: fixedDraw.cards.map((card, positionIndex) => ({
      position_index: positionIndex,
      card_id: card.cardId,
      name_en: card.nameEn,
      name_zh_tw: card.nameZhTw,
      arcana: card.arcana,
      number_or_rank: String(card.numberOrRank || ""),
      suit: card.suit || null,
      position: card.position,
      position_label_zh_tw: card.positionLabelZhTw,
      orientation: card.orientation,
    })),
    messages: normalizeFollowUps(body?.followUps),
  };
}

export function historyRowToSummary(row) {
  return {
    readingId: row.id,
    question: row.question,
    spreadNameZhTw: row.spread_name_zh_tw,
    overview: row.reading_result?.synthesis?.overview || "這次的牌面已經展開。",
    cardCount: Array.isArray(row.reading_result?.cards) ? row.reading_result.cards.length : 0,
    followUpCount: Number(row.message_count || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    expiresAt: row.expires_at,
  };
}

export function historyRowsToSnapshot(reading, cards, messages) {
  const fixedCards = cards.map((card) => ({
    cardId: card.card_id,
    nameEn: card.name_en,
    nameZhTw: card.name_zh_tw,
    arcana: card.arcana,
    numberOrRank: card.number_or_rank,
    ...(card.suit ? { suit: card.suit } : {}),
    position: card.position,
    positionLabelZhTw: card.position_label_zh_tw,
    orientation: card.orientation,
  }));

  return {
    version: 3,
    readingId: reading.id,
    requestId: reading.request_id,
    question: reading.question,
    spreadId: reading.spread_id,
    selectedCardIndexes: reading.selected_card_indexes,
    draw: {
      readingId: reading.id,
      question: reading.question,
      spread: {
        id: reading.spread_id,
        nameZhTw: reading.spread_name_zh_tw,
        positions: fixedCards.map((card) => ({
          id: card.position,
          labelZhTw: card.positionLabelZhTw,
        })),
      },
      selectedCardIndexes: reading.selected_card_indexes,
      cards: fixedCards,
    },
    result: reading.reading_result,
    followUps: messages.map((message) => ({
      question: message.question,
      answer: message.answer,
      practicalFocus: message.practical_focus || "",
      safety: message.safety || null,
    })),
  };
}
