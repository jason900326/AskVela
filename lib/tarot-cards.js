import cards from "../data/tarot/cards.json" with { type: "json" };

export const TAROT_CARDS = Object.freeze(cards);

export const TAROT_CARD_BY_ID = new Map(
  TAROT_CARDS.map((card) => [card.card_id, card]),
);

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isCjk(value) {
  return /[\u3400-\u9fff]/u.test(value);
}

function aliasMatches(question, alias) {
  if (isCjk(alias)) {
    if (question.includes(alias)) return true;
    return !alias.endsWith("牌") && question.includes(`${alias}牌`);
  }

  return new RegExp(`\\b${escapeRegExp(alias)}\\b`, "iu").test(question);
}

export function identifyTarotQuery(question) {
  const normalizedQuestion = String(question || "").normalize("NFKC");
  const matchedCards = TAROT_CARDS.filter((card) => {
    const aliases = [card.name_en, card.name_zh_tw, ...(card.aliases || [])]
      .sort((left, right) => right.length - left.length);
    return aliases.some((alias) => aliasMatches(normalizedQuestion, alias));
  });

  const asksReversed = /(?:逆位|逆向|reversed?|upside[ -]?down)/iu.test(normalizedQuestion);
  const asksUpright = /(?:正位|upright)/iu.test(normalizedQuestion);
  let orientation = null;
  if (asksReversed && !asksUpright) {
    orientation = "reversed";
  } else if (asksUpright && !asksReversed) {
    orientation = "upright";
  }

  return {
    cardIds: [...new Set(matchedCards.map((card) => card.card_id))],
    cards: matchedCards,
    orientation,
  };
}

export function validateTarotRegistry(registry = TAROT_CARDS) {
  const errors = [];
  const ids = new Set();

  if (registry.length !== 78) errors.push(`Expected 78 cards; found ${registry.length}.`);

  for (const card of registry) {
    for (const field of ["card_id", "name_en", "name_zh_tw", "arcana", "number_or_rank"]) {
      if (!card[field]) errors.push(`${card.card_id || "Unknown card"} is missing ${field}.`);
    }
    if (ids.has(card.card_id)) errors.push(`Duplicate card_id: ${card.card_id}.`);
    ids.add(card.card_id);

    if (card.arcana === "minor") {
      if (!["wands", "cups", "swords", "pentacles"].includes(card.suit)) {
        errors.push(`${card.card_id} has an invalid suit.`);
      }
      if (typeof card.court_card !== "boolean") {
        errors.push(`${card.card_id} is missing court_card.`);
      }
    }
  }

  const majorCount = registry.filter((card) => card.arcana === "major").length;
  if (majorCount !== 22) errors.push(`Expected 22 Major Arcana; found ${majorCount}.`);

  for (const suit of ["wands", "cups", "swords", "pentacles"]) {
    const count = registry.filter((card) => card.suit === suit).length;
    if (count !== 14) errors.push(`Expected 14 ${suit} cards; found ${count}.`);
  }

  return errors;
}
