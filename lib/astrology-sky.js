import { getZodiacByLongitude, getZodiacSign, publicZodiacSign } from "./zodiac.js";

const DAY_MS = 86_400_000;
const DEG = Math.PI / 180;

export function normalizeDegrees(value) {
  return ((Number(value) % 360) + 360) % 360;
}

function sinDeg(value) {
  return Math.sin(value * DEG);
}

function parseLocalDate(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/u);
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12));
  if (Number.isNaN(date.getTime())) return null;
  if (date.toISOString().slice(0, 10) !== `${match[1]}-${match[2]}-${match[3]}`) return null;
  return date;
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(value, days) {
  const date = parseLocalDate(value);
  if (!date) return null;
  return formatDate(new Date(date.getTime() + days * DAY_MS));
}

function daysSinceJ2000(value) {
  const date = parseLocalDate(value);
  if (!date) throw new TypeError("localDate must be a valid YYYY-MM-DD date");
  return (date.getTime() - Date.UTC(2000, 0, 1, 12)) / DAY_MS;
}

// Low-cost solar/lunar approximation for the first sun-sign experience. It is
// intentionally not presented as a full ephemeris or natal-chart calculation.
export function approximateSunLongitude(localDate) {
  const n = daysSinceJ2000(localDate);
  const meanLongitude = normalizeDegrees(280.460 + 0.9856474 * n);
  const meanAnomaly = normalizeDegrees(357.528 + 0.9856003 * n);
  return normalizeDegrees(meanLongitude + 1.915 * sinDeg(meanAnomaly) + 0.020 * sinDeg(2 * meanAnomaly));
}

export function approximateMoonLongitude(localDate) {
  const n = daysSinceJ2000(localDate);
  const l0 = normalizeDegrees(218.316 + 13.176396 * n);
  const moonAnomaly = normalizeDegrees(134.963 + 13.064993 * n);
  const elongation = normalizeDegrees(297.850 + 12.190749 * n);
  const sunAnomaly = normalizeDegrees(357.529 + 0.98560028 * n);
  const argumentLatitude = normalizeDegrees(93.272 + 13.229350 * n);

  return normalizeDegrees(
    l0
    + 6.289 * sinDeg(moonAnomaly)
    + 1.274 * sinDeg(2 * elongation - moonAnomaly)
    + 0.658 * sinDeg(2 * elongation)
    + 0.214 * sinDeg(2 * moonAnomaly)
    - 0.186 * sinDeg(sunAnomaly)
    - 0.059 * sinDeg(2 * elongation - 2 * moonAnomaly)
    - 0.057 * sinDeg(2 * elongation - sunAnomaly - moonAnomaly)
    + 0.053 * sinDeg(2 * elongation + moonAnomaly)
    + 0.046 * sinDeg(2 * elongation - sunAnomaly)
    + 0.041 * sinDeg(sunAnomaly - moonAnomaly)
    - 0.035 * sinDeg(elongation)
    - 0.031 * sinDeg(sunAnomaly + moonAnomaly)
    - 0.015 * sinDeg(2 * argumentLatitude - 2 * elongation)
    + 0.011 * sinDeg(2 * elongation - 4 * moonAnomaly),
  );
}

function angularDistance(a, b) {
  const delta = Math.abs(normalizeDegrees(a) - normalizeDegrees(b));
  return delta > 180 ? 360 - delta : delta;
}

const ASPECTS = [
  { id: "conjunction", angle: 0, labelZhTw: "合相", tone: "集中" },
  { id: "sextile", angle: 60, labelZhTw: "六分相", tone: "較容易協調" },
  { id: "square", angle: 90, labelZhTw: "四分相", tone: "需要調整" },
  { id: "trine", angle: 120, labelZhTw: "三分相", tone: "較流暢" },
  { id: "opposition", angle: 180, labelZhTw: "對分相", tone: "兩端拉扯" },
];

export function nearestAspect(longitudeA, longitudeB, orb = 8) {
  const separation = angularDistance(longitudeA, longitudeB);
  let best = null;
  for (const aspect of ASPECTS) {
    const distance = Math.abs(separation - aspect.angle);
    if (distance <= orb && (!best || distance < best.orb)) {
      best = { ...aspect, orb: Number(distance.toFixed(1)), separation: Number(separation.toFixed(1)) };
    }
  }
  return best;
}

function phaseFromAngle(angle) {
  const value = normalizeDegrees(angle);
  const phases = [
    [22.5, "新月附近"],
    [67.5, "眉月"],
    [112.5, "上弦月附近"],
    [157.5, "盈凸月"],
    [202.5, "滿月附近"],
    [247.5, "虧凸月"],
    [292.5, "下弦月附近"],
    [337.5, "殘月"],
    [360, "新月附近"],
  ];
  const match = phases.find(([limit]) => value < limit) || phases[phases.length - 1];
  return { angle: Number(value.toFixed(1)), nameZhTw: match[1] };
}

function bodySnapshot(name, nameZhTw, longitude) {
  const sign = getZodiacByLongitude(longitude);
  return {
    name,
    nameZhTw,
    longitude: Number(normalizeDegrees(longitude).toFixed(2)),
    sign: publicZodiacSign(sign),
  };
}

function dailySnapshot(localDate) {
  const sunLongitude = approximateSunLongitude(localDate);
  const moonLongitude = approximateMoonLongitude(localDate);
  const phase = phaseFromAngle(moonLongitude - sunLongitude);
  const sunMoonAspect = nearestAspect(moonLongitude, sunLongitude, 8);

  return {
    date: localDate,
    sun: bodySnapshot("sun", "太陽", sunLongitude),
    moon: bodySnapshot("moon", "月亮", moonLongitude),
    moonPhase: phase,
    // This is an actual angular relationship between two computed bodies. We do
    // NOT fabricate an exact aspect to the midpoint of the user's sun sign.
    sunMoonAspect,
  };
}

function mondayOfWeek(localDate) {
  const date = parseLocalDate(localDate);
  if (!date) throw new TypeError("localDate must be a valid YYYY-MM-DD date");
  const day = date.getUTCDay();
  const delta = day === 0 ? -6 : 1 - day;
  return addDays(localDate, delta);
}

function describeDailySignals(snapshot) {
  const signals = [
    `太陽位於${snapshot.sun.sign.nameZhTw}`,
    `月亮位於${snapshot.moon.sign.nameZhTw}`,
    `月相：${snapshot.moonPhase.nameZhTw}`,
  ];
  if (snapshot.sunMoonAspect) {
    signals.push(`太陽與月亮形成${snapshot.sunMoonAspect.labelZhTw}（約 ${snapshot.sunMoonAspect.orb}° orb）`);
  }
  return signals;
}

export function buildDailySkyContext({ signId, localDate }) {
  const sign = getZodiacSign(signId);
  if (!sign || !parseLocalDate(localDate)) throw new TypeError("Invalid astrology input");
  const snapshot = dailySnapshot(localDate);
  return {
    period: "daily",
    dateRange: { start: localDate, end: localDate },
    sign: publicZodiacSign(sign),
    method: {
      zodiac: "tropical",
      scope: "selected sun-sign + approximate current Sun/Moon sky",
      referenceTime: "12:00 UTC on the selected local calendar date",
      precisionNote: "The first Astrology version computes approximate current Sun/Moon longitudes. It does not claim an exact natal aspect without an actual natal degree.",
    },
    snapshots: [snapshot],
    signals: describeDailySignals(snapshot),
  };
}

export function buildWeeklySkyContext({ signId, localDate }) {
  const sign = getZodiacSign(signId);
  if (!sign || !parseLocalDate(localDate)) throw new TypeError("Invalid astrology input");
  const start = mondayOfWeek(localDate);
  const dates = Array.from({ length: 7 }, (_, index) => addDays(start, index));
  const snapshots = dates.map((date) => dailySnapshot(date));
  const moonSequence = [];
  for (const snapshot of snapshots) {
    const id = snapshot.moon.sign.id;
    if (moonSequence.at(-1)?.id !== id) moonSequence.push({ ...snapshot.moon.sign, date: snapshot.date });
  }
  const aspectHighlights = snapshots
    .filter((snapshot) => snapshot.sunMoonAspect)
    .map((snapshot) => ({ date: snapshot.date, ...snapshot.sunMoonAspect }));
  const startPhase = snapshots[0].moonPhase;
  const endPhase = snapshots.at(-1).moonPhase;

  return {
    period: "weekly",
    dateRange: { start, end: dates.at(-1) },
    sign: publicZodiacSign(sign),
    method: {
      zodiac: "tropical",
      scope: "selected sun-sign + approximate current Sun/Moon sky",
      referenceTime: "12:00 UTC for each calendar date in the selected week",
      precisionNote: "The first Astrology version computes approximate current Sun/Moon longitudes. It does not claim exact natal aspects, houses, ascendant, or a full natal chart.",
    },
    snapshots,
    signals: [
      `本週月亮依序經過：${moonSequence.map((item) => `${item.nameZhTw}（${item.date.slice(5)} 起）`).join(" → ")}`,
      `月相由${startPhase.nameZhTw}走向${endPhase.nameZhTw}`,
      ...(aspectHighlights.length
        ? aspectHighlights.map((item) => `${item.date.slice(5)}：太陽與月亮形成${item.labelZhTw}（約 ${item.orb}° orb）`)
        : ["本週在 Vela 使用的容許度內沒有太陽—月亮主要相位。"]),
    ],
  };
}

export function buildAstrologySkyContext({ signId, period, localDate }) {
  if (period === "daily") return buildDailySkyContext({ signId, localDate });
  if (period === "weekly") return buildWeeklySkyContext({ signId, localDate });
  throw new TypeError("period must be daily or weekly");
}
