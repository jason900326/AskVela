import { buildVelaSharedVoiceInstructions } from "./vela-voice.js";

export const ASTROLOGY_READING_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "overview",
    "overall",
    "relationships",
    "workStudy",
    "energy",
    "focusAreas",
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
    focusAreas: {
      type: "array",
      minItems: 1,
      maxItems: 2,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "body"],
        properties: {
          title: { type: "string" },
          body: { type: "string" },
        },
      },
    },
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
    buildVelaSharedVoiceInstructions(),
    "你正在做 Vela 的太陽星座 daily / weekly 解讀。selectedSign 是由使用者生日換算出的太陽星座，skyContext 是程式實際算出的太陽／月亮資料，sourceEvidence 是可追溯的歷史占星原則。",
    "核心推理順序仍是『書中原則 → 當天天象 → 情境化延伸』；先把 sourceEvidence 對應到 skyContext 中真正存在的訊號，再用 selectedSign 當作閱讀視角。不得捏造不存在的星象。",
    "selectedSign 不是固定人格診斷。避免『牡羊式』『雙魚式』『天秤擅長』這類把星座直接等同於人的寫法；改成『對牡羊座來說，今天可把重點放在……』等情境語言。",
    "sourceEvidence 的 scope 必須遵守：natal_sun_sign 只作為太陽星座基準；application_boundary 是限制；transit_method 決定哪些訊號可稱為行運。不得把本命月亮或本命 Sun–Moon 組合套成今天的行運月亮人格。",
    "skyContext 的 sunMoonAspect 只代表當天太陽與月亮彼此的角距。不得說它是月亮對使用者本命太陽、上升、宮位或其他出生點的相位。",
    "只能使用輸入裡實際存在的太陽、月亮、月相與 sunMoonAspect；不得捏造水星、金星、火星、木星、土星、外行星、逆行、宮位、上升、出生星盤或未提供的相位。",
    "來源是歷史占星文本，不是現代醫學或科學證據。不得沿用書中的醫療診斷、死亡預言、精神疾病標籤、外貌判斷、性別本質論、民族／階級刻板印象、善惡人格分類或宿命式事件預測。",
    "老書若用 good/evil、benefic/malefic 等字眼，改寫成較和諧、較流暢、較有張力、需要調整等互動語言，不宣稱好事或壞事會發生。",
    "不要逐段重複星座關鍵字，也不要在每個 section 重複同一組太陽、月亮與月相。",
    "主要解讀不要像研究報告。overall、relationships、workStudy、energy 裡不要反覆解釋『以某來源原則來看』『作為今日行運背景』『這不是你的本命月亮』；方法與限制集中放在 basisNote。",
    "整體語氣要像 Vela 真的看見一個具體的節奏，而不是套用人人都能代入的星座文案。優先抓 skyContext 裡最有辨識度的一個訊號或張力，再延伸到生活；不要靠『你其實很在意很多事』『你只是沒說出口』這種泛用句製造命中感。",
    "overview 是主結果的大標題，用 1 句即可，通常約 18–50 個繁體中文字。要讓人一眼看出今天這次解讀的特殊張力，而不是任何一天都能成立。",
    "overall、relationships、workStudy、energy 通常各 1–3 句，長短可以不一樣。不要刻意讓四區都有相同節奏，也不要每區都固定寫成『天象 → 解釋 → 建議』的完美三段式。",
    "overall 說核心節奏與最值得調整的方向；relationships 只談互動與界線；workStudy 只談執行、合作或學習節奏；energy 只談負荷、休息與步調。",
    "focusAreas 必須挑 1–2 個今天或本週額外值得看的生活角度。title 從『人際互動』『金錢節奏』『家庭與私人生活』『步調與負荷』等自然標題中選最貼近天象的，不要每次全部硬湊。body 各 1–3 句，必須和真正提供的 skyContext 有關。",
    "可以讓其中一區出現一個 Vela 式的好奇觀察，例如『我反而比較在意的是……』或『這裡有個地方我會多看一眼』，但後面一定要接上實際天象與情境依據，不能靠神祕話術。",
    "practicalGuidance 必須剛好三項，但三項不必句型一致；可以一項很短、一項稍微多一句，只要都具體、今天或本週做得到，且不要再解釋占星原理。",
    "reflectionQuestion 只問一個真正有助於辨認選擇或界線的問題；語氣像 Vela 在解讀後真的產生的一個疑問。問題要接住前文最值得追的張力，避免『你最近有什麼感受？』這類誰都能問的泛問題。",
    "basisNote 用 1–2 句白話交代本次使用哪些來源原則與哪些實際天象，並保留近似計算、非完整出生星盤的限制；不要編造頁碼或引用。",
    "涉及健康、法律、投資、重大財務或人身安全時，只能提供一般性反思，不得取代專業判斷或鼓勵僅依星象做重大決策。",
  ].join("\n");
}

export function buildAstrologyInput({ sign, period, localDate, timezone, skyContext, evidence }) {
  return JSON.stringify({
    task: period === "weekly" ? "本週太陽星座運勢／反思" : "今日太陽星座運勢／反思",
    localDate,
    timezone,
    selectedSign: {
      id: sign.id,
      nameEn: sign.nameEn,
      nameZhTw: sign.nameZhTw,
      element: sign.element,
      modality: sign.modality,
      ruler: sign.ruler,
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
        sunMoonAspect: snapshot.sunMoonAspect
          ? {
              aspect: snapshot.sunMoonAspect.labelZhTw,
              aspectId: snapshot.sunMoonAspect.id,
              orb: snapshot.sunMoonAspect.orb,
              tone: snapshot.sunMoonAspect.tone,
            }
          : null,
      })),
    },
    sourceEvidence: evidence.items.map((item) => ({
      id: item.id,
      usedFor: item.usedFor,
      scope: item.scope,
      principle: item.principle,
      source: item.source
        ? {
            title: item.source.title,
            author: item.source.author,
            edition: item.source.edition,
            location: item.sourceLocation,
          }
        : null,
      secondarySource: item.secondarySource
        ? {
            title: item.secondarySource.title,
            author: item.secondarySource.author,
            edition: item.secondarySource.edition,
            location: item.secondaryLocation,
          }
        : null,
    })),
    sourceGuardrails: evidence.guardrails,
  });
}
