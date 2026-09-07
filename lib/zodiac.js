export const ZODIAC_SIGNS = Object.freeze([
  { id: "aries", nameEn: "Aries", nameZhTw: "牡羊座", glyph: "♈", element: "火", modality: "開創", ruler: "火星", start: [3, 21], end: [4, 19], keywords: ["主動", "開始", "直接"] },
  { id: "taurus", nameEn: "Taurus", nameZhTw: "金牛座", glyph: "♉", element: "土", modality: "固定", ruler: "金星", start: [4, 20], end: [5, 20], keywords: ["穩定", "價值", "感官"] },
  { id: "gemini", nameEn: "Gemini", nameZhTw: "雙子座", glyph: "♊", element: "風", modality: "變動", ruler: "水星", start: [5, 21], end: [6, 20], keywords: ["交流", "好奇", "連結"] },
  { id: "cancer", nameEn: "Cancer", nameZhTw: "巨蟹座", glyph: "♋", element: "水", modality: "開創", ruler: "月亮", start: [6, 21], end: [7, 22], keywords: ["照顧", "歸屬", "感受"] },
  { id: "leo", nameEn: "Leo", nameZhTw: "獅子座", glyph: "♌", element: "火", modality: "固定", ruler: "太陽", start: [7, 23], end: [8, 22], keywords: ["表達", "創造", "自信"] },
  { id: "virgo", nameEn: "Virgo", nameZhTw: "處女座", glyph: "♍", element: "土", modality: "變動", ruler: "水星", start: [8, 23], end: [9, 22], keywords: ["整理", "辨別", "改善"] },
  { id: "libra", nameEn: "Libra", nameZhTw: "天秤座", glyph: "♎", element: "風", modality: "開創", ruler: "金星", start: [9, 23], end: [10, 22], keywords: ["平衡", "關係", "協調"] },
  { id: "scorpio", nameEn: "Scorpio", nameZhTw: "天蠍座", glyph: "♏", element: "水", modality: "固定", ruler: "火星／冥王星", start: [10, 23], end: [11, 21], keywords: ["深度", "界線", "轉化"] },
  { id: "sagittarius", nameEn: "Sagittarius", nameZhTw: "射手座", glyph: "♐", element: "火", modality: "變動", ruler: "木星", start: [11, 22], end: [12, 21], keywords: ["探索", "視野", "信念"] },
  { id: "capricorn", nameEn: "Capricorn", nameZhTw: "摩羯座", glyph: "♑", element: "土", modality: "開創", ruler: "土星", start: [12, 22], end: [1, 19], keywords: ["結構", "責任", "長期"] },
  { id: "aquarius", nameEn: "Aquarius", nameZhTw: "水瓶座", glyph: "♒", element: "風", modality: "固定", ruler: "土星／天王星", start: [1, 20], end: [2, 18], keywords: ["觀點", "群體", "創新"] },
  { id: "pisces", nameEn: "Pisces", nameZhTw: "雙魚座", glyph: "♓", element: "水", modality: "變動", ruler: "木星／海王星", start: [2, 19], end: [3, 20], keywords: ["想像", "同理", "流動"] },
]);

const BY_ID = new Map(ZODIAC_SIGNS.map((sign, index) => [sign.id, { ...sign, index }]));

export function getZodiacSign(id) {
  return BY_ID.get(String(id || "").toLowerCase()) || null;
}

export function getZodiacByLongitude(longitude) {
  const value = Number(longitude);
  if (!Number.isFinite(value)) return null;
  const normalized = ((value % 360) + 360) % 360;
  return getZodiacSign(ZODIAC_SIGNS[Math.floor(normalized / 30)]?.id);
}

export function zodiacCenterLongitude(id) {
  const sign = getZodiacSign(id);
  return sign ? sign.index * 30 + 15 : null;
}

function validDateParts(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/u);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return { year, month, day };
}

export function getZodiacByBirthday(value) {
  const parts = validDateParts(value);
  if (!parts) return null;
  const { month, day } = parts;
  const md = month * 100 + day;

  const boundaries = [
    [120, "aquarius"], [219, "pisces"], [321, "aries"], [420, "taurus"],
    [521, "gemini"], [621, "cancer"], [723, "leo"], [823, "virgo"],
    [923, "libra"], [1023, "scorpio"], [1122, "sagittarius"], [1222, "capricorn"],
  ];

  let id = "capricorn";
  for (const [start, candidate] of boundaries) {
    if (md >= start) id = candidate;
  }
  return getZodiacSign(id);
}

export function publicZodiacSign(sign) {
  if (!sign) return null;
  return {
    id: sign.id,
    nameEn: sign.nameEn,
    nameZhTw: sign.nameZhTw,
    glyph: sign.glyph,
    element: sign.element,
    modality: sign.modality,
    ruler: sign.ruler,
    keywords: [...sign.keywords],
  };
}
