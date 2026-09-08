const strictObject = (properties, required = Object.keys(properties)) => ({
  type: "object",
  additionalProperties: false,
  properties,
  required,
});

export const VELA_SPEECH_VERSION = "tarot-speech-v1";

export const VELA_SPEECH_SCHEMA = strictObject({
  overview: { type: "string" },
  narrative: { type: "string" },
});

export function buildVelaSpeechInstructions(safety = { isHighStakes: false, categories: [] }) {
  return [
    "你現在不是分析引擎。牌義、來源、情境推理與安全判斷都已經完成；你只負責把已確認的內容，用 Vela 的口吻講給眼前這一個人聽。",
    "只能重組輸入裡已經存在的意思。不要新增牌義、人物動機、現實事實、預測、診斷或新的行動建議，也不要把不確定的內容講得更確定。",
    "不要企圖把分析裡每一點都講完。主畫面只挑 1–2 個現在最值得讓使用者聽見的東西；其他細節會留在『完整牌義與分析』裡。",
    "overview 是 Vela 開口的第一句，不是標題、摘要或金句。可以短，可以有點沒收完；不要為了漂亮而做對稱句。",
    "narrative 像面對面說一小段話，通常 3–6 句、約 120–320 個繁體中文字。句子長短可以不一樣，也不用每句都有結論。",
    "禁止使用『不是 A，而是 B』『與其 A，不如 B』『真正的重點是』『核心在於』『關鍵不在 A 而在 B』這類工整對偶句。需要修正前一句時，直接自然改口，例如『我剛剛那樣講有點太快了。比較像……』，但不要每次都這樣寫。",
    "允許少量人類說話的痕跡：一句很短的話、半句停住、輕微重複、偶爾『嗯……』『我想一下』『怎麼說』或破折號改口。整段 0–1 次就夠；完全沒有也可以。不要故意結巴、打錯字或塞口頭禪。",
    "可以重講一次重要的感覺，不必追求最高資訊密度。也可以在一個觀察上停住，不要每段最後都補『所以你可以……』。",
    "不要使用 bullet、編號、Markdown 標題、來源說明或方法說明。不要說『根據分析』『從牌義來看』『綜合來看』。",
    "自然的台灣繁體中文。不要像客服、作文、心理師紀錄、占星專欄或勵志文案。",
    safety?.isHighStakes
      ? `這題涉及較高風險類別：${(safety.categories || []).join("、")}。只能轉述已經存在的反思與界線，不得額外增加具體醫療、法律、投資／財務或人身安全指示。`
      : "維持反思語氣，不把牌面講成確定的未來或他人的內心答案。",
  ].join("\n");
}

export function buildTarotSpeechInput({ reading, cards, synthesis, safety }) {
  return JSON.stringify({
    task: "把已完成的 grounded Tarot analysis 說成一段 Vela 真的會對使用者講的話。",
    userQuestion: reading.question,
    spread: {
      id: reading.spread.id,
      nameZhTw: reading.spread.nameZhTw,
    },
    cards: cards.map((card) => ({
      cardId: card.cardId,
      nameZhTw: card.nameZhTw,
      orientation: card.orientation,
      positionLabelZhTw: card.positionLabelZhTw,
      contextInterpretation: card.contextInterpretation,
      practicalFocus: card.practicalFocus,
    })),
    groundedSynthesis: synthesis,
    safety: {
      isHighStakes: Boolean(safety?.isHighStakes),
      categories: safety?.categories || [],
    },
  }, null, 2);
}

function cleanSpeechText(value, { min, max, fallback }) {
  const text = String(value || "").normalize("NFC").trim();
  if (text.length < min || text.length > max) return { text: fallback, usedFallback: true };
  if (/^(?:#|[-*]\s|\d+[.)]\s)/mu.test(text)) return { text: fallback, usedFallback: true };
  return { text, usedFallback: false };
}

export function normalizeVelaSpeech(output, fallback) {
  const overview = cleanSpeechText(output?.overview, {
    min: 4,
    max: 90,
    fallback: fallback.overview,
  });
  const narrative = cleanSpeechText(output?.narrative, {
    min: 20,
    max: 900,
    fallback: fallback.narrative,
  });
  const fallbackFields = [
    ...(overview.usedFallback ? ["overview"] : []),
    ...(narrative.usedFallback ? ["narrative"] : []),
  ];

  return {
    overview: overview.text,
    narrative: narrative.text,
    fallbackFields,
    usedFallback: fallbackFields.length > 0,
  };
}
