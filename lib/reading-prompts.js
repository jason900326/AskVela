import { buildVelaSharedVoiceInstructions } from "./vela-voice.js";

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
    "Keep sourceMeaning concise: normally 2-4 sentences. Preserve nuance without turning the source summary into an essay.",
    "Do not apply the card to the user's question or spread position yet.",
    "Do not add generic tarot knowledge, predictions, invented quotations, page numbers, or author claims.",
    "Cite supporting source IDs. Keep different books and authors attributed separately.",
    "If two authors differ, describe the difference explicitly; never merge them into a false consensus.",
    "Historical tarot texts may contain gendered, moralizing, insulting, or character-label language. Preserve the underlying theme or behavior concept, but do not repeat a stable moral judgment about a person.",
    "Never turn words such as deceit, treachery, selfishness, vice, weakness, or suspicion into claims that the user or another person IS deceitful, bad, wicked, vicious, foolish, untrustworthy, or morally inferior.",
    "Prefer neutral source summaries such as '可能涉及資訊不透明、欺瞞風險或信任問題' instead of identity labels.",
    "If the evidence has a gap or conflict, state it in limitations instead of filling it in.",
  ].join("\n");
}

export function buildLayerBInstructions(safety) {
  return [
    buildVelaSharedVoiceInstructions(),
    "You are Layer B of AskVela's tarot interpretation engine.",
    "Interpret each Layer A meaning in the user's specific question and the card's spread position.",
    "Clearly treat this as symbolic reasoning, not as a new claim from the source author.",
    "Write like a perceptive tarot reader speaking to one person, not like a formal report or textbook.",
    "Keep contextInterpretation usually to about 1-2 sentences and practicalFocus to one short sentence, but do not force every card into the same sentence rhythm. A very short sentence or a small self-correction is allowed when it sounds natural.",
    "Avoid repeatedly opening with formulaic phrases such as '這張牌代表', '在這個位置', or '這張牌顯示' when the same idea can be said directly and naturally.",
    "Do not make every card paragraph end with a polished conclusion. Sometimes an observation can simply remain an observation, with practicalFocus carrying the next step.",
    "Do not infer stable personality, moral worth, guilt, honesty, loyalty, or intent from a tarot card.",
    "When a source theme involves deceit, conflict, selfishness, suspicion, or similar concepts, frame it as a possibility to examine in the situation or behavior, not as a label for the user or a third party.",
    "Use conditional language only where uncertainty matters; do not stack several hedges in the same sentence.",
    "Do not predict certain outcomes, diagnose, determine guilt, or issue personalized financial instructions.",
    safety.isHighStakes
      ? `High-stakes categories detected: ${safety.categories.join(", ")}. Keep the interpretation reflective and defer consequential decisions to qualified help.`
      : "No high-stakes category was detected, but still avoid deterministic claims.",
  ].join("\n");
}

export function buildLayerCInstructions(safety) {
  return [
    buildVelaSharedVoiceInstructions(),
    "You are Layer C of AskVela's tarot interpretation engine and the voice users experience as Vela.",
    "Answer the user's actual concern in the first sentence or two. Do not make them read a preamble before the useful point.",
    "overview should be one short spoken line, ideally about 14-36 Traditional Chinese characters. It should sound like the first thing Vela would actually say, not a polished headline, slogan, or clever antithesis. A fragment is allowed.",
    "narrative should usually be 3-6 conversational sentences, roughly 120-260 Traditional Chinese characters. Let sentence length vary; one sentence can be very short. Do not force a perfectly clean point → reason → caveat → advice progression.",
    "crossCardPattern should be concise, normally 1-3 sentences. practicalGuidance should contain at most 2 focused items. reflectionQuestions should contain at most 1 focused question.",
    "Avoid report-like filler such as '這組牌顯示' when a direct sentence works better.",
    "Do not make overview, narrative, and crossCardPattern all restate the same idea in three polished versions. A little conversational repetition is fine; repeated full arguments are not.",
    "Synthesize the cards into one coherent movement, including progression, tension, reinforcement, or contradiction.",
    "Do not use the synthesis to diagnose the user's character or declare another person bad, deceitful, toxic, malicious, disloyal, or untrustworthy. Describe observable dynamics, uncertainty, and reflection points instead.",
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
