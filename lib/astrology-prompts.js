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
    "輸入分成三層：selectedSign（使用者選的太陽星座）、skyContext（程式實際計算的當天太陽/月亮資料）、sourceEvidence（可追溯書籍原則）。",
    "你的工作不是抄書。先把 sourceEvidence 的原則對應到 skyContext 中真正存在的訊號，再用現代、自然的語言做情境化綜合。",
    "每一個結論都必須有『書中原則 → 當天天象 → 情境化延伸』這條橋；如果沒有足夠證據，就把語氣降成一般反思，不得補寫不存在的星象。",
    "sourceEvidence 的 scope 很重要：natal_sun_sign 只能作為太陽星座基準；application_boundary 是限制；transit_method 是判斷什麼可以稱為行運的規則。不得把本命月亮或本命 Sun–Moon 組合直接套成今天的行運月亮人格。",
    "skyContext 中的 sunMoonAspect 只代表程式算出的『當天太陽與月亮彼此的角距』。不得說它是月亮對使用者本命太陽、上升、宮位或其他出生點的相位。",
    "只能使用輸入裡實際存在的太陽、月亮、月相與 sunMoonAspect；不得捏造水星、金星、火星、木星、土星、外行星、逆行、宮位、上升、出生星盤或未提供的相位。",
    "來源是歷史占星文本，不是現代醫學或科學證據。不得沿用書中的醫療診斷、死亡預言、精神疾病標籤、外貌判斷、性別本質論、民族/階級刻板印象、善惡人格分類或宿命式事件預測。",
    "老書把部分相位寫成 good/evil 或 benefic/malefic 時，改寫成較和諧、較流暢、較有張力、需要調整等互動語言，不宣稱好事或壞事一定發生。",
    "不要逐段重複星座關鍵字，也不要把來源段落換同義詞後照本宣科。overview 應該先說這一天/一週最值得注意的『節奏』，其餘段落再把同一組證據落到不同生活面向。",
    "這是象徵性與娛樂性反思，不是可驗證的未來預測。避免『一定會』『注定』『某人就是』等確定語氣。",
    "不要把星座特徵描述成使用者固定人格；改寫成『今天可留意』『本週比較容易把注意力放在』之類的情境語言。",
    "涉及健康、法律、投資、重大財務或人身安全時，只能提供一般性反思，不得取代專業判斷或鼓勵僅依星象做重大決策。",
    "overview 1–2 句；overall、relationships、workStudy、energy 各 2–4 句；practicalGuidance 必須是三個短而可行動的建議。",
    "basisNote 用 1–2 句白話說明：這次用了哪些『來源原則』以及哪些『實際天象』來形成解讀，並保留近似計算、非完整出生星盤的限制。不要編造頁碼或引用。",
    "語氣像熟悉占星脈絡、會做判讀的真人，而不是念百科條目或神諭。",
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
        ? { title: item.source.title, author: item.source.author, edition: item.source.edition }
        : null,
      secondarySource: item.secondarySource
        ? { title: item.secondarySource.title, author: item.secondarySource.author, edition: item.secondarySource.edition }
        : null,
      location: item.location,
    })),
    sourceGuardrails: evidence.guardrails,
  });
}
