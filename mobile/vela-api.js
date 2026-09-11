const rawBaseUrl = process.env.EXPO_PUBLIC_VELA_API_URL || '';

export const VELA_API_BASE_URL = rawBaseUrl.replace(/\/+$/, '');
export const LIVE_READING_ENABLED = Boolean(VELA_API_BASE_URL);
export const DEFAULT_SPREAD_ID = 'situation-obstacle-advice';

export function makeRequestId() {
  return `mobile-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

async function postJson(path, body, requestId) {
  if (!LIVE_READING_ENABLED) {
    throw new Error('EXPO_PUBLIC_VELA_API_URL is not configured.');
  }

  const response = await fetch(`${VELA_API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(requestId ? { 'Idempotency-Key': requestId } : {}),
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data?.error || `Request failed with status ${response.status}`);
    error.code = data?.code || 'VELA_API_ERROR';
    error.status = response.status;
    throw error;
  }
  return data;
}

export function drawTarotReading({
  question,
  selectedCardIndexes,
  requestId,
  spreadId = DEFAULT_SPREAD_ID,
}) {
  return postJson(
    '/api/readings/draw',
    { question, spreadId, requestId, selectedCardIndexes },
    requestId,
  );
}

export function interpretTarotReading({
  question,
  readingId,
  selectedCardIndexes,
  requestId,
  spreadId = DEFAULT_SPREAD_ID,
}) {
  return postJson(
    '/api/readings/interpret',
    { question, spreadId, requestId, readingId, selectedCardIndexes },
    requestId,
  );
}

export function followUpTarotReading({
  question,
  readingId,
  selectedCardIndexes,
  requestId,
  message,
  history = [],
  initialReading,
  spreadId = DEFAULT_SPREAD_ID,
}) {
  const operationId = `${requestId}:follow-up:${history.length + 1}`;
  return postJson(
    '/api/readings/follow-up',
    {
      question,
      spreadId,
      requestId,
      readingId,
      selectedCardIndexes,
      message,
      history,
      initialReading,
    },
    operationId,
  );
}

export function normalizeDrawCards(draw) {
  return (draw?.cards || []).map((card, index) => ({
    id: card.cardId || `server-card-${index}`,
    cardId: card.cardId,
    name: card.nameZhTw || card.nameEn || '未知牌',
    english: card.nameEn || '',
    arcana: card.arcana || '',
    suit: card.suit || '',
    numberOrRank: card.numberOrRank || '',
    reversed: card.orientation === 'reversed',
    orientation: card.orientation,
    position: card.position,
    positionLabel: card.positionLabelZhTw || '',
  }));
}
