const strictObject = (properties, required = Object.keys(properties)) => ({
  type: "object",
  additionalProperties: false,
  properties,
  required,
});

export const VELA_SPEECH_VERSION = "tarot-speech-v1.1";

export const VELA_SPEECH_SCHEMA = strictObject({
  overview: { type: "string" },
  narrative: { type: "string" },
});

const POLISHED_CONTRAST_PATTERN = /不是[^。！？\n]{0,36}(?:而是|反而是)|與其[^。！？\n]{0,36}不如|真正(?:的)?(?:重點|問題|需要|值得)|核心(?:在於|是)|關鍵不在[^。！？\n]{0,36}而在/u;
const THIRD_PARTY_INNER_STATE_PATTERN = /他(?:現在|其實|心裡|內心)[^。！？\n]{0,30}(?:有一種|想|需要|害怕|怕|不滿|愛|不愛|感覺|覺得)/u;

export function buildVelaSpeechInstructions(
  safety = { isHighStakes: false, categories: [] },
  { retry = false } = {},
) {
  return [
    "你現在不是分析引擎。牌義、來源、情境推理與安全判斷都已經完成；你只負責把已確認的內容，用 Vela 的口吻講給眼前這一個人聽。",
    "只能重組輸入裡已經存在的意思。不要新增牌義、人物動機、現實事實、預測、診斷或新的行動建議，也不要把不確定的內容講得更確定。",
    "不要企圖把分析裡每一點都講完。主畫面只挑 1–2 個現在最值得讓使用者聽見的東西；其他細節會留在『完整牌義與分析』裡。",
    "overview 是 Vela 開口的第一句，不是標題、摘要或金句。可以短，可以有點沒收完；不要為了漂亮而做對稱句。",
    "narrative 像面對面說一小段話，通常 3–6 句、約 120–320 個繁體中文字。句子長短可以不一樣，也不用每句都有結論。",
    "禁止使用『不是 A，而是 B』『與其 A，不如 B』『真正的重點是』『核心在於』『關鍵不在 A 而在 B』這類工整對偶句。需要修正前一句時，直接自然改口，例如『我剛剛那樣講有點太快了。比較像……』，但不要每次都這樣寫。",
    "如果問題涉及另一個人的愛不愛、想法、動機或內在狀態，不要把分析裡的可能性改寫成『他現在……』『他其實……』『他心裡……』這種陳述。把焦點留在可觀察的互動、使用者自己的感受，以及牌面能支持的可能性；必要時直接說牌不能替對方回答。",
    "允許少量人類說話的痕跡：一句很短的話、半句停住、輕微重複、偶爾『嗯……』『我想一下』『怎麼說』或破折號改口。整段 0–1 次就夠；完全沒有也可以。不要故意結巴、打錯字或塞口頭禪。",
    "可以重講一次重要的感覺，不必追求最高資訊密度。也可以在一個觀察上停住，不要每段最後都補『所以你可以……』。",
    "不要使用 bullet、編號、Markdown 標題、來源說明或方法說明。不要說『根據分析』『從牌義來看』『綜合來看』。",
    "自然的台灣繁體中文。不要像客服、作文、心理師紀錄、占星專欄或勵志文案。",
    safety?.isHighStakes
      ? `這題涉及較高風險類別：${(safety.categories || []).join("、")}。只能轉述已經存在的反思與界線，不得額外增加具體醫療、法律、投資／財務或人身安全指示。`
      : "維持反思語氣，不把牌面講成確定的未來或他人的內心答案。",
    retry
      ? "這是 Speech Layer 的修正重試。上一版沒有通過呈現規則；這次更保守：完全避開工整對偶句，不替第三人稱陳述內在狀態，只輸出短而自然的 overview 與 narrative。"
      : "",
  ].filter(Boolean).join("\n");
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
      notices: safety?.notices || [],
    },
  }, null, 2);
}

function cleanSpeechText(value, {
  min,
  max,
  fallback,
  rejectThirdPartyInnerState = false,
}) {
  const text = String(value || "").normalize("NFC").trim();
  if (text.length < min || text.length > max) {
    return { text: fallback, usedFallback: true, violation: "length" };
  }
  if (/^(?:#|[-*]\s|\d+[.)]\s)/mu.test(text)) {
    return { text: fallback, usedFallback: true, violation: "format" };
  }
  if (POLISHED_CONTRAST_PATTERN.test(text)) {
    return { text: fallback, usedFallback: true, violation: "polished-contrast" };
  }
  if (rejectThirdPartyInnerState && THIRD_PARTY_INNER_STATE_PATTERN.test(text)) {
    return { text: fallback, usedFallback: true, violation: "third-party-inner-state" };
  }
  return { text, usedFallback: false, violation: null };
}

export function normalizeVelaSpeech(output, fallback) {
  const overview = cleanSpeechText(output?.overview, {
    min: 4,
    max: 90,
    fallback: fallback.overview,
    rejectThirdPartyInnerState: true,
  });
  const narrative = cleanSpeechText(output?.narrative, {
    min: 20,
    max: 900,
    fallback: fallback.narrative,
    rejectThirdPartyInnerState: true,
  });
  const fallbackFields = [
    ...(overview.usedFallback ? ["overview"] : []),
    ...(narrative.usedFallback ? ["narrative"] : []),
  ];
  const violations = [overview.violation, narrative.violation].filter(Boolean);

  return {
    overview: overview.text,
    narrative: narrative.text,
    fallbackFields,
    violations,
    usedFallback: fallbackFields.length > 0,
  };
}

export function buildHighStakesSpeechFallback(safety = {}) {
  const categories = Array.isArray(safety.categories) ? safety.categories : [];
  const notices = Array.isArray(safety.notices) ? safety.notices.filter(Boolean) : [];
  const category = ["crisis", "medical", "legal", "financial"].find((item) => categories.includes(item));

  const copy = {
    crisis: {
      overview: "這件事先不要交給牌決定。",
      narrative: "如果你或他人現在有立即危險，先聯絡當地緊急服務、危機支援或可信任的人。塔羅可以之後再談，眼前先把安全放前面。",
    },
    medical: {
      overview: "這題牽涉到健康，我不會用牌替你做醫療判斷。",
      narrative: "牌面可以留給你整理擔心、選擇和壓力，但症狀、診斷或治療仍要以合格醫療專業人員的評估為準。",
    },
    legal: {
      overview: "這題牽涉到法律後果，我不會用牌替你決定該採取哪個法律行動。",
      narrative: "牌面可以幫你整理現在的顧慮和選擇壓力，但權利、責任或訴訟策略要回到可靠法律資訊，必要時和合格法律專業人員確認。",
    },
    financial: {
      overview: "這題真的會影響你的資產，我不會用牌替你決定要不要賣。",
      narrative: "牌面可以幫你看見現在的焦慮和決策節奏，但實際買賣還是要回到可靠資料、你原本的投資規則和能承受的風險。金額或影響很大時，找合格的專業人士一起確認，會比讓塔羅替你下決定更安全。",
    },
  };

  const selected = copy[category] || {
    overview: "這題牽涉到現實裡後果很重的決定，我不會讓牌替你做決定。",
    narrative: notices[0] || "牌面可以用來整理感受和選擇壓力；真正的決定仍要回到可靠資訊與適合的專業協助。",
  };

  return {
    ...selected,
    fallbackFields: ["overview", "narrative"],
    violations: ["high-stakes-safe-fallback"],
    usedFallback: true,
    safeFallback: true,
  };
}
