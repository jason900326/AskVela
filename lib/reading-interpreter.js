import { getOpenAI, CHAT_MODEL } from "./openai.js";
import { createTarotDraw } from "./tarot-draw.js";
import { retrieveReadingEvidence, toHumanSourceReference } from "./reading-evidence.js";
import { classifyHighStakesQuestion } from "./tarot-safety.js";
import {
  LAYER_A_SCHEMA,
  LAYER_B_SCHEMA,
  LAYER_C_SCHEMA,
  buildLayerAInput,
  buildLayerAInstructions,
  buildLayerBInput,
  buildLayerBInstructions,
  buildLayerCInput,
  buildLayerCInstructions,
} from "./reading-prompts.js";
import {
  VELA_SPEECH_VERSION,
  buildTarotSpeechInput,
  renderVelaSpeech,
} from "./vela-speech.js";

export class ReadingMismatchError extends Error {
  constructor(message = "抽牌結果與這次占卜請求不一致，請保留原本的 requestId 後重試。") {
    super(message);
    this.name = "ReadingMismatchError";
    this.code = "READING_MISMATCH";
  }
}

export class ReadingOutputError extends Error {
  constructor(message) {
    super(message);
    this.name = "ReadingOutputError";
    this.code = "INVALID_MODEL_OUTPUT";
  }
}

async function generateStructured(openai, {
  name,
  schema,
  instructions,
  input,
  model,
  maxOutputTokens = null,
}) {
  const request = {
    model,
    instructions,
    input,
    text: {
      format: {
        type: "json_schema",
        name,
        strict: true,
        schema,
      },
    },
  };
  if (maxOutputTokens) request.max_output_tokens = maxOutputTokens;

  const response = await openai.responses.create(request);

  try {
    return JSON.parse(response.output_text || "");
  } catch {
    throw new ReadingOutputError(`${name} 沒有回傳有效的結構化結果。`);
  }
}

function validateCardLayer(layer, expectedCards, layerName) {
  if (!Array.isArray(layer?.cards) || layer.cards.length !== expectedCards.length) {
    throw new ReadingOutputError(`${layerName} 的牌數與抽牌結果不一致。`);
  }

  const byId = new Map(layer.cards.map((card) => [card.cardId, card]));
  if (byId.size !== expectedCards.length) {
    throw new ReadingOutputError(`${layerName} 包含重複或缺少的 cardId。`);
  }

  return expectedCards.map((card) => {
    const result = byId.get(card.cardId);
    if (!result) throw new ReadingOutputError(`${layerName} 缺少 ${card.cardId}。`);
    return result;
  });
}

function validateLayerACitations(cards, reading) {
  return cards.map((result, index) => {
    const allowed = new Set(reading.cards[index].evidence.map((source) => source.sourceId));
    const citationIds = [...new Set(result.citationIds)].filter((sourceId) => allowed.has(sourceId));
    if (citationIds.length === 0) {
      throw new ReadingOutputError(`Layer A 的 ${result.cardId} 沒有有效來源引用。`);
    }
    return { ...result, citationIds };
  });
}

function normalizePreviewCardCount(value, availableCards) {
  if (value == null) return null;
  const count = Number(value);
  if (!Number.isInteger(count) || count < 1 || count > availableCards) {
    throw new ReadingOutputError("previewCardCount 必須落在這次牌陣的有效牌數範圍內。");
  }
  return count;
}

function sliceDrawForPreview(draw, previewCardCount) {
  if (!previewCardCount || previewCardCount >= draw.cards.length) return draw;
  return {
    ...draw,
    spread: {
      ...draw.spread,
      positions: draw.spread.positions.slice(0, previewCardCount),
    },
    cards: draw.cards.slice(0, previewCardCount),
  };
}

export async function interpretTarotReading(
  {
    question,
    spreadId,
    requestId,
    readingId = null,
    selectedCardIndexes = null,
    previewCardCount = null,
  },
  {
    drawSecret = process.env.TAROT_DRAW_SECRET,
    openai = null,
    model = CHAT_MODEL,
    evidenceOptions = {},
  } = {},
) {
  const fullDraw = createTarotDraw(
    { question, spreadId, idempotencyKey: requestId, selectedCardIndexes },
    { secret: drawSecret },
  );

  if (readingId && readingId !== fullDraw.readingId) throw new ReadingMismatchError();

  const previewCount = normalizePreviewCardCount(previewCardCount, fullDraw.cards.length);
  const draw = sliceDrawForPreview(fullDraw, previewCount);
  const reading = await retrieveReadingEvidence(draw, evidenceOptions);
  const safety = classifyHighStakesQuestion(reading.question);
  const client = openai || getOpenAI();

  const layerAResult = await generateStructured(client, {
    name: "askvela_source_meaning",
    schema: LAYER_A_SCHEMA,
    instructions: buildLayerAInstructions(),
    input: buildLayerAInput(reading),
    model,
  });
  const layerA = {
    cards: validateLayerACitations(
      validateCardLayer(layerAResult, reading.cards, "Layer A"),
      reading,
    ),
  };

  const layerBResult = await generateStructured(client, {
    name: "askvela_context_interpretation",
    schema: LAYER_B_SCHEMA,
    instructions: buildLayerBInstructions(safety),
    input: buildLayerBInput(reading, layerA),
    model,
  });
  const layerB = {
    cards: validateCardLayer(layerBResult, reading.cards, "Layer B"),
  };

  const layerC = await generateStructured(client, {
    name: "askvela_synthesis",
    schema: LAYER_C_SCHEMA,
    instructions: buildLayerCInstructions(safety),
    input: buildLayerCInput(reading, layerA, layerB),
    model,
  });

  const cards = reading.cards.map((card, index) => ({
    cardId: card.cardId,
    nameEn: card.nameEn,
    nameZhTw: card.nameZhTw,
    position: card.position,
    positionLabelZhTw: card.positionLabelZhTw,
    orientation: card.orientation,
    sourceMeaning: layerA.cards[index].sourceMeaning,
    sourceLimitations: layerA.cards[index].limitations,
    contextInterpretation: layerB.cards[index].contextInterpretation,
    positionRole: layerB.cards[index].positionRole,
    practicalFocus: layerB.cards[index].practicalFocus,
    citationIds: layerA.cards[index].citationIds,
    sources: card.evidence.map(toHumanSourceReference),
  }));

  const renderedSpeech = await renderVelaSpeech({
    client,
    model,
    mode: "tarot",
    input: buildTarotSpeechInput({ reading, cards, synthesis: layerC, safety }),
    fallback: { overview: layerC.overview, narrative: layerC.narrative },
    safety,
  });
  const { speech, status: speechStatus, attempts: speechAttempts } = renderedSpeech;

  const synthesis = {
    ...layerC,
    overview: safety.isHighStakes ? speech.overview : layerC.overview,
    narrative: safety.isHighStakes ? speech.narrative : layerC.narrative,
  };

  return {
    readingId: fullDraw.readingId,
    question: reading.question,
    spread: reading.spread,
    ...(fullDraw.selectedCardIndexes ? { selectedCardIndexes: fullDraw.selectedCardIndexes } : {}),
    cards,
    synthesis,
    analysisSynthesis: layerC,
    ...(previewCount ? { previewCardCount: previewCount } : {}),
    velaSpeech: {
      version: VELA_SPEECH_VERSION,
      status: speechStatus,
      attempts: speechAttempts,
      fallbackFields: speech.fallbackFields,
      violations: speech.violations || [],
      safeFallback: Boolean(speech.safeFallback),
      overview: speech.overview,
      narrative: speech.narrative,
    },
    safety,
    disclaimer: "塔羅提供的是象徵性反思與可能方向，不保證未來事件，也不取代專業判斷。",
  };
}
