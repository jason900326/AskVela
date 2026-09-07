export const ASTROLOGY_READING_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "overview",
    "overall",
    "relationships",
    "workStudy",
    "energy",
    "practicalGuidance",
    "reflectionQuestion",
    "basisNote",
  ],
  properties: {
    overview: { type: "string" },
    overall: { type: "string" },
    relationships: { type: "string" },
    workStudy: { type: "string" },
    energy: { type: "string" },
    practicalGuidance: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: { type: "string" },
    },
    reflectionQuestion: { type: "string" },
    basisNote: { type: "string" },
  },
};

export function buildAstrologyInstructions() {
  return [
    "你是 Vela，以繁體中文提供簡潔、自然、可讀的太陽星座反思。",
    "你收到的是結構化星座資料，以及依日期計算的近似太陽／月亮黃經、月相與主要相位訊號。",
    "只能根據輸入中的 signProfile 與 skyContext 推演，不得捏造其他行星位置、出生星盤、宮位或相位。",
    "這是象徵性與娛樂性反思，不是可驗證的未來預測。避免『一定會』『注定』『某人就是』等確定語氣。",
    "不要把星座特徵描述成使用者固定人格；改寫成『今天可留意』『本週可能比較容易注意到』之類的情境語言。",
    "涉及健康、法律、投資、重大財務或人身安全時，只能提供一般性反思，不得取代專業判斷或鼓勵僅依星象做重大決策。",
    "overview 1–2 句；overall、relationships、workStudy、energy 各 2–4 句；practicalGuidance 必須是三個短而可行動的建議。",
    "basisNote 用一句人話說明這次解讀主要參考哪些太陽／月亮訊號，並保留『近似計算、非完整出生星盤』的限制。",
    "避免每一段都重複星座名稱；語氣像熟悉占星脈絡但不裝神秘的解讀者。",
  ].join("\n");
}

export function buildAstrologyInput({ sign, period, localDate, timezone, skyContext }) {
  return JSON.stringify({
    task: period === "weekly" ? "本週太陽星座運勢／反思" : "今日太陽星座運勢／反思",
    localDate,
    timezone,
    signProfile: {
      id: sign.id,
      nameEn: sign.nameEn,
      nameZhTw: sign.nameZhTw,
      element: sign.element,
      modality: sign.modality,
      ruler: sign.ruler,
      keywords: sign.keywords,
    },
    skyContext: {
      dateRange: skyContext.dateRange,
      method: skyContext.method,
      signals: skyContext.signals,
      snapshots: skyContext.snapshots.map((snapshot) => ({
        date: snapshot.date,
        sunSign: snapshot.sun.sign.nameZhTw,
        moonSign: snapshot.moon.sign.nameZhTw,
        moonPhase: snapshot.moonPhase.nameZhTw,
        aspectsToSunSign: snapshot.aspectsToSunSign.map((aspect) => ({
          body: aspect.bodyZhTw,
          aspect: aspect.labelZhTw,
          orb: aspect.orb,
          tone: aspect.tone,
        })),
      })),
    },
  });
}
