function strictObject(properties, required = Object.keys(properties)) {
  return {
    type: "object",
    additionalProperties: false,
    properties,
    required,
  };
}

const stringArray = { type: "array", items: { type: "string" } };

export const LAYER_A_SCHEMA = strictObject({
  cards: {
    type: "array",
    items: strictObject({
      cardId: { type: "string" },
      sourceMeaning: { type: "string" },
      citationIds: stringArray,
      limitations: stringArray,
    }),
  },
});

export const LAYER_B_SCHEMA = strictObject({
  cards: {
    type: "array",
    items: strictObject({
      cardId: { type: "string" },
      positionRole: { type: "string" },
      contextInterpretation: { type: "string" },
      practicalFocus: { type: "string" },
    }),
  },
});

export const LAYER_C_SCHEMA = strictObject({
  overview: { type: "string" },
  narrative: { type: "string" },
  crossCardPattern: { type: "string" },
  practicalGuidance: stringArray,
  reflectionQuestions: stringArray,
});

export function buildLayerAInstructions() {
  return [
    "You are Layer A of AskVela's tarot interpretation engine.",
    "Write natural Traditional Chinese as used in Taiwan.",
    "For every card, summarize only the supplied source excerpts for the drawn orientation.",
    "Do not apply the card to the user's question or spread position yet.",
    "Do not add generic tarot knowledge, predictions, invented quotations, page numbers, or author claims.",
    "Cite supporting source IDs. Keep different books and authors attributed separately.",
    "If the evidence has a gap or conflict, state it in limitations instead of filling it in.",
  ].join("\n");
}

export function buildLayerBInstructions(safety) {
  return [
    "You are Layer B of AskVela's tarot interpretation engine.",
    "Write natural Traditional Chinese as used in Taiwan.",
    "Interpret each Layer A meaning in the user's specific question and the card's spread position.",
    "Clearly treat this as symbolic reasoning, not as a new claim from the source author.",
    "Do not predict certain outcomes, diagnose, determine guilt, or issue personalized financial instructions.",
    safety.isHighStakes
      ? `High-stakes categories detected: ${safety.categories.join(", ")}. Keep the interpretation reflective and defer consequential decisions to qualified help.`
      : "No high-stakes category was detected, but still avoid deterministic claims.",
  ].join("\n");
}

export function buildLayerCInstructions(safety) {
  return [
    "You are Layer C of AskVela's tarot interpretation engine.",
    "Write natural Traditional Chinese as used in Taiwan, in a calm, clear, empathetic tarot-reader voice.",
    "Synthesize the cards into one coherent movement, including progression, tension, reinforcement, or contradiction.",
    "Do not merely repeat the individual card paragraphs.",
    "For a single-card reading, leave crossCardPattern as an empty string.",
    "Offer grounded reflection and small practical directions, never certainty about the future.",
    safety.isHighStakes
      ? "Do not let the synthesis replace professional or emergency assistance. Avoid prescriptive high-stakes advice."
      : "Keep all outcomes conditional and reflective.",
  ].join("\n");
}

function evidenceText(card) {
  return card.evidence.map((source) => [
    `[${source.sourceId}]`,
    `Book: ${source.bookTitle || "Unknown"}`,
    `Author: ${source.author || "Unknown"}`,
    `Section: ${source.sectionType || "Unknown"}`,
    `Orientation: ${source.orientation || "shared"}`,
    `Location: ${JSON.stringify(source.sourceLocation || {})}`,
    source.content,
  ].join("\n")).join("\n\n---\n\n");
}

export function buildLayerAInput(reading) {
  return reading.cards.map((card) => [
    `CARD ID: ${card.cardId}`,
    `CARD: ${card.nameZhTw} (${card.nameEn})`,
    `DRAWN ORIENTATION: ${card.orientation}`,
    "SOURCE EXCERPTS:",
    evidenceText(card),
  ].join("\n")).join("\n\n==========\n\n");
}

export function buildLayerBInput(reading, layerA) {
  const cards = reading.cards.map((card) => {
    const source = layerA.cards.find((item) => item.cardId === card.cardId);
    return {
      cardId: card.cardId,
      card: `${card.nameZhTw} (${card.nameEn})`,
      orientation: card.orientation,
      position: card.position,
      positionLabelZhTw: card.positionLabelZhTw,
      layerASourceMeaning: source?.sourceMeaning || "",
      layerALimitations: source?.limitations || [],
    };
  });

  return JSON.stringify({
    question: reading.question,
    spread: reading.spread,
    cards,
  }, null, 2);
}

export function buildLayerCInput(reading, layerA, layerB) {
  return JSON.stringify({
    question: reading.question,
    spread: reading.spread,
    cards: reading.cards.map((card) => ({
      cardId: card.cardId,
      card: `${card.nameZhTw} (${card.nameEn})`,
      orientation: card.orientation,
      positionLabelZhTw: card.positionLabelZhTw,
      sourceMeaning: layerA.cards.find((item) => item.cardId === card.cardId)?.sourceMeaning || "",
      contextInterpretation: layerB.cards.find((item) => item.cardId === card.cardId)?.contextInterpretation || "",
      practicalFocus: layerB.cards.find((item) => item.cardId === card.cardId)?.practicalFocus || "",
    })),
  }, null, 2);
}

