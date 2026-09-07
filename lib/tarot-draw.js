import { createHmac } from "node:crypto";
import { TAROT_CARDS } from "./tarot-cards.js";
import { getTarotSpread } from "./tarot-spreads.js";

const UINT32_RANGE = 0x1_0000_0000;
const MIN_IDEMPOTENCY_KEY_LENGTH = 8;
const MAX_IDEMPOTENCY_KEY_LENGTH = 200;

export class DrawValidationError extends Error {
  constructor(message, code = "INVALID_DRAW_REQUEST") {
    super(message);
    this.name = "DrawValidationError";
    this.code = code;
  }
}

function validateQuestion(value) {
  const question = String(value || "").trim();
  if (!question) {
    throw new DrawValidationError("請先輸入問題。", "QUESTION_REQUIRED");
  }
  if (question.length > 500) {
    throw new DrawValidationError("問題太長，請控制在 500 字元內。", "QUESTION_TOO_LONG");
  }
  return question;
}

function validateIdempotencyKey(value) {
  const key = String(value || "").trim();
  if (!key) {
    throw new DrawValidationError(
      "缺少 Idempotency-Key；請為每次新占卜產生一個 UUID，重試時沿用同一個值。",
      "IDEMPOTENCY_KEY_REQUIRED",
    );
  }
  if (key.length < MIN_IDEMPOTENCY_KEY_LENGTH || key.length > MAX_IDEMPOTENCY_KEY_LENGTH) {
    throw new DrawValidationError(
      `Idempotency-Key 長度須介於 ${MIN_IDEMPOTENCY_KEY_LENGTH} 到 ${MAX_IDEMPOTENCY_KEY_LENGTH} 字元。`,
      "INVALID_IDEMPOTENCY_KEY",
    );
  }
  return key;
}

function validateSecret(value) {
  const secret = String(value || "");
  if (secret.length < 32) {
    throw new Error("TAROT_DRAW_SECRET must contain at least 32 characters.");
  }
  return secret;
}

function createDeterministicRandom(seed, secret) {
  let counter = 0;
  let words = [];

  function nextUint32() {
    if (words.length === 0) {
      const digest = createHmac("sha256", secret)
        .update(seed)
        .update(":")
        .update(String(counter))
        .digest();
      counter += 1;
      words = Array.from({ length: 8 }, (_, index) => digest.readUInt32BE(index * 4));
    }
    return words.shift();
  }

  return function randomInt(maxExclusive) {
    if (!Number.isInteger(maxExclusive) || maxExclusive < 1) {
      throw new RangeError("maxExclusive must be a positive integer.");
    }

    const limit = Math.floor(UINT32_RANGE / maxExclusive) * maxExclusive;
    let value = nextUint32();
    while (value >= limit) value = nextUint32();
    return value % maxExclusive;
  };
}

function formatReadingId(bytes) {
  const hex = Buffer.from(bytes).toString("hex").slice(0, 32).split("");
  hex[12] = "4";
  hex[16] = ((Number.parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  const value = hex.join("");
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}

export function createTarotDraw(
  { question: rawQuestion, spreadId: rawSpreadId, idempotencyKey: rawIdempotencyKey },
  { secret: rawSecret = process.env.TAROT_DRAW_SECRET } = {},
) {
  const question = validateQuestion(rawQuestion);
  const idempotencyKey = validateIdempotencyKey(rawIdempotencyKey);
  const spread = getTarotSpread(rawSpreadId);
  if (!spread) {
    throw new DrawValidationError("找不到這個牌陣。", "UNKNOWN_SPREAD");
  }
  const secret = validateSecret(rawSecret);
  const requestFingerprint = JSON.stringify({ question, spreadId: spread.id, idempotencyKey });
  const seed = createHmac("sha256", secret).update(requestFingerprint).digest("hex");
  const randomInt = createDeterministicRandom(seed, secret);
  const deck = [...TAROT_CARDS];

  for (let index = deck.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1);
    [deck[index], deck[swapIndex]] = [deck[swapIndex], deck[index]];
  }

  const cards = spread.positions.map((position, index) => {
    const card = deck[index];
    return {
      cardId: card.card_id,
      nameEn: card.name_en,
      nameZhTw: card.name_zh_tw,
      arcana: card.arcana,
      numberOrRank: card.number_or_rank,
      ...(card.suit ? { suit: card.suit } : {}),
      position: position.id,
      positionLabelZhTw: position.labelZhTw,
      orientation: randomInt(2) === 0 ? "upright" : "reversed",
    };
  });

  const readingDigest = createHmac("sha256", secret)
    .update("reading:")
    .update(requestFingerprint)
    .digest();

  return {
    readingId: formatReadingId(readingDigest),
    question,
    spread: {
      id: spread.id,
      nameZhTw: spread.nameZhTw,
      positions: spread.positions.map((position) => ({ ...position })),
    },
    cards,
  };
}

