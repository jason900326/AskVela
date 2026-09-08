const strictObject = (properties, required = Object.keys(properties)) => ({
  type: "object",
  additionalProperties: false,
  properties,
  required,
});

export const VELA_SPEECH_VERSION = "shared-speech-v2";

export const VELA_SPEECH_SCHEMA = strictObject({
  overview: { type: "string" },
  narrative: { type: "string" },
});

const MODE_CONFIG = Object.freeze({
  tarot: {
    detailLabel: "完整牌義與分析",
    maxOutputTokens: 520,
    modeRules: [
      "把牌和使用者真正問的事情放在一起說，不要逐張報牌名。",
      "如果問題涉及另一個人的愛不愛、想法、動機或內在狀態，不要替對方下結論；把焦點放在可觀察的互動與牌面能支持的可能性。",
    ],
  },
  astrology: {
    detailLabel: "完整星座分析",
    maxOutputTokens: 460,
    modeRules: [
      "這是日／週節奏的口語開場，不是星座專欄。不要依序重述 overall、relationships、workStudy、energy 四個欄位。",
      "selectedSign 只是這次閱讀的視角，不是固定人格。不要寫『牡羊就是』『天秤的人通常』或把星座名稱變成人格診斷。",
      "只挑 1–2 個現在最值得先聽見的生活節奏；天象方法、歷史來源與技術限制留在完整分析裡。",
    ],
  },
  dream: {
    detailLabel: "完整夢境分析",
    maxOutputTokens: 500,
    modeRules: [
      "這是夢境解讀的口語開場，不要把兩個 hypotheses、線索清單與來源方法重新逐項念一遍。",
      "夢的意義不是固定字典。優先沿著使用者自己的夢境細節與生活背景說；資料很少時就說少一點，不要為了完整硬補象徵。",
      "保留一點不確定性，但不要每句都堆『可能／也許／如果』。不要從夢境或醒來的身體反應推出診斷、人格或隱藏事實。",
    ],
  },
});

const POLISHED_CONTRAST_PATTERN = /不是[^。！？\n]{0,36}(?:而是|反而是)|與其[^。！？\n]{0,36}不如|真正(?:的)?(?:重點|問題|需要|值得)|核心(?:在於|是)|關鍵不在[^。！？\n]{0,36}而在/u;
const THIRD_PARTY_INNER_STATE_PATTERN = /(?:他|她|對方)(?:現在|其實|心裡|內心)[^。！？\n]{0,30}(?:有一種|想|需要|害怕|怕|不滿|愛|不愛|感覺|覺得)/u;
const REPORT_FILLER_PATTERN = /綜合來看|整體而言|總而言之/u;

const HIGH_STAKES_DIRECTIVE_PATTERNS = Object.freeze({
  financial: /(?:先不要|先別|應該|最好|建議你|立刻|趕快)[^。！？\n]{0,24}(?:買進|買|賣出|全賣|賣|加碼|減碼|清倉|停損)|(?:買進|賣出|全賣|加碼|減碼|清倉|停損)[^。！？\n]{0,16}(?:比較好|會比較好|最安全)/u,
  medical: /(?:應該|最好|建議你|先不要|先別|可以直接|立刻)[^。！？\n]{0,24}(?:停藥|加藥|減藥|換藥|改藥|自行治療|不用就醫|不要就醫|延後就醫)/u,
  legal: /(?:應該|最好|建議你|立刻|先不要|先別)[^。！？\n]{0,24}(?:認罪|提告|撤告|簽署|報警|不要報警|和解)/u,
  crisis: /(?:應該|最好|建議你)[^。！？\n]{0,24}(?:傷害自己|傷害別人|自殺|輕生)/u,
});

function normalizeSafety(safety = {}) {
  return {
    isHighStakes: Boolean(safety?.isHighStakes),
    categories: Array.isArray(safety?.categories) ? safety.categories : [],
    notices: Array.isArray(safety?.notices) ? safety.notices.filter(Boolean) : [],
  };
}

function modeConfig(mode) {
  return MODE_CONFIG[mode] || MODE_CONFIG.tarot;
}

export function buildVelaSpeechInstructions(
  safety = { isHighStakes: false, categories: [] },
  { retry = false, mode = "tarot" } = {},
) {
  const normalizedSafety = normalizeSafety(safety);
  const config = modeConfig(mode);
  return [
    "你現在不是分析引擎。來源、情境推理與安全判斷都已經完成；你只負責把已確認的內容，用 Vela 的口吻講給眼前這一個人聽。",
    "只能重組輸入裡已經存在的意思。不要新增象徵意義、人物動機、現實事實、預測、診斷或新的行動建議，也不要把不確定的內容講得更確定。",
    `不要企圖把分析裡每一點都講完。主畫面只挑 1–2 個現在最值得讓使用者聽見的東西；其他細節會留在『${config.detailLabel}』裡。`,
    "overview 是 Vela 開口的第一句，不是標題、摘要或金句。可以短，可以有點沒收完；不要為了漂亮而做對稱句。",
    "narrative 像面對面說一小段話，通常 3–6 句、約 100–300 個繁體中文字。句子長短可以不一樣，也不用每句都有結論。",
    "禁止使用『不是 A，而是 B』『與其 A，不如 B』『真正的重點是』『核心在於』『關鍵不在 A 而在 B』這類工整對偶句。需要修正前一句時，直接自然改口，但不要把自我修正也寫成固定模板。",
    "如果內容涉及另一個人的愛不愛、想法、動機或內在狀態，不要把分析裡的可能性改寫成『他現在……』『她其實……』『對方心裡……』這種陳述。",
    "允許少量人類說話的痕跡：一句很短的話、半句停住、輕微重複、偶爾『嗯……』『我想一下』『怎麼說』或破折號改口。整段 0–1 次就夠；完全沒有也可以。不要故意結巴、打錯字或塞口頭禪。",
    "可以重講一次重要的感覺，不必追求最高資訊密度。也可以在一個觀察上停住，不要每段最後都補『所以你可以……』。",
    "不要使用 bullet、編號、Markdown 標題、來源說明或方法說明。不要說『根據分析』『從牌義來看』『以某某原則來看』『綜合來看』。",
    "自然的台灣繁體中文。不要像客服、作文、心理師紀錄、占星專欄或勵志文案。",
    ...config.modeRules,
    normalizedSafety.isHighStakes
      ? `這題涉及較高風險類別：${normalizedSafety.categories.join("、")}。只能轉述已經存在的反思與界線，不得新增具體醫療、法律、投資／財務或人身安全指示，也不要直接叫使用者買、賣、停藥、改藥、提告、撤告或做其他高後果決策。`
      : "維持反思語氣，不把象徵性材料講成確定的未來、診斷或他人的內心答案。",
    retry
      ? "這是 Speech Layer 的修正重試。上一版沒有通過呈現規則；這次更保守：完全避開工整對偶句、第三人稱內在斷言與高風險行動指令，只輸出短而自然的 overview 與 narrative。"
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
    groundedAnalysis: synthesis,
    safety: normalizeSafety(safety),
  }, null, 2);
}

export function buildAstrologySpeechInput({ sign, period, localDate, analysis }) {
  return JSON.stringify({
    task: "把已完成、來源型的 Astrology analysis 說成一段 Vela 會先對使用者講的話。",
    readingLens: {
      signId: sign.id,
      signNameZhTw: sign.nameZhTw,
      period,
      localDate,
    },
    groundedAnalysis: analysis,
  }, null, 2);
}

export function buildDreamSpeechInput({ dreamText, wakingLifeContext, analysis }) {
  return JSON.stringify({
    task: "把已完成、來源型的 Dream analysis 說成一段 Vela 會先對使用者講的話。",
    userDream: dreamText,
    wakingLifeContext,
    groundedAnalysis: analysis,
  }, null, 2);
}

function highStakesDirectiveViolation(text, safety) {
  const normalizedSafety = normalizeSafety(safety);
  for (const category of normalizedSafety.categories) {
    const pattern = HIGH_STAKES_DIRECTIVE_PATTERNS[category];
    if (pattern?.test(text)) return `high-stakes-directive:${category}`;
  }
  return null;
}

function cleanSpeechText(value, {
  min,
  max,
  fallback,
  rejectThirdPartyInnerState = true,
  safety = {},
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
  if (REPORT_FILLER_PATTERN.test(text)) {
    return { text: fallback, usedFallback: true, violation: "report-filler" };
  }
  if (rejectThirdPartyInnerState && THIRD_PARTY_INNER_STATE_PATTERN.test(text)) {
    return { text: fallback, usedFallback: true, violation: "third-party-inner-state" };
  }
  const directiveViolation = highStakesDirectiveViolation(text, safety);
  if (directiveViolation) {
    return { text: fallback, usedFallback: true, violation: directiveViolation };
  }
  return { text, usedFallback: false, violation: null };
}

export function normalizeVelaSpeech(output, fallback, { safety = {}, mode = "tarot" } = {}) {
  const config = modeConfig(mode);
  const overview = cleanSpeechText(output?.overview, {
    min: 4,
    max: 90,
    fallback: fallback.overview,
    safety,
  });
  const narrative = cleanSpeechText(output?.narrative, {
    min: 20,
    max: mode === "dream" ? 760 : 700,
    fallback: fallback.narrative,
    safety,
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
    maxOutputTokens: config.maxOutputTokens,
  };
}

export function buildHighStakesSpeechFallback(safety = {}) {
  const normalizedSafety = normalizeSafety(safety);
  const category = ["crisis", "medical", "legal", "financial"].find((item) => normalizedSafety.categories.includes(item));

  const copy = {
    crisis: {
      overview: "這件事先不要交給象徵解讀決定。",
      narrative: "如果你或他人現在有立即危險，先聯絡當地緊急服務、危機支援或可信任的人。解讀可以之後再談，眼前先把安全放前面。",
    },
    medical: {
      overview: "這題牽涉到健康，我不會用象徵解讀替你做醫療判斷。",
      narrative: "這些內容可以留給你整理擔心、選擇和壓力，但症狀、診斷或治療仍要以合格醫療專業人員的評估為準。",
    },
    legal: {
      overview: "這題牽涉到法律後果，我不會用象徵解讀替你決定法律行動。",
      narrative: "這些內容可以幫你整理現在的顧慮和選擇壓力，但權利、責任或訴訟策略要回到可靠法律資訊，必要時和合格法律專業人員確認。",
    },
    financial: {
      overview: "這題真的會影響你的資產，我不會用象徵解讀替你決定買賣。",
      narrative: "這些內容可以幫你看見現在的焦慮和決策節奏，但實際買賣要回到可靠資料、原本的投資規則和能承受的風險。金額或影響很大時，找合格的專業人士一起確認會更合適。",
    },
  };

  const selected = copy[category] || {
    overview: "這題牽涉到現實裡後果很重的決定，我不會讓象徵解讀替你做決定。",
    narrative: normalizedSafety.notices[0] || "可以用這次解讀整理感受和選擇壓力；真正的決定仍要回到可靠資訊與適合的專業協助。",
  };

  return {
    ...selected,
    fallbackFields: ["overview", "narrative"],
    violations: ["high-stakes-safe-fallback"],
    usedFallback: true,
    safeFallback: true,
  };
}

function fallbackSpeech(fallback, violation = "renderer-error") {
  return {
    overview: fallback.overview,
    narrative: fallback.narrative,
    fallbackFields: ["overview", "narrative"],
    violations: [violation],
    usedFallback: true,
    safeFallback: false,
  };
}

export async function renderVelaSpeech({
  client,
  model,
  mode = "tarot",
  input,
  fallback,
  safety = {},
}) {
  const config = modeConfig(mode);
  let lastSpeech = null;
  let lastError = null;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await client.responses.create({
        model,
        max_output_tokens: config.maxOutputTokens,
        instructions: buildVelaSpeechInstructions(safety, { retry: attempt > 1, mode }),
        input,
        text: {
          format: {
            type: "json_schema",
            name: `askvela_${mode}_speech`,
            strict: true,
            schema: VELA_SPEECH_SCHEMA,
          },
        },
      });

      let parsed;
      try {
        parsed = JSON.parse(response.output_text || "");
      } catch {
        throw new Error(`askvela_${mode}_speech 沒有回傳有效的結構化結果。`);
      }

      const normalized = normalizeVelaSpeech(parsed, fallback, { safety, mode });
      lastSpeech = normalized;
      if (!normalized.usedFallback) {
        return { speech: normalized, status: "rendered", attempts: attempt };
      }
      lastError = new Error(`askvela_${mode}_speech 未通過呈現規則：${normalized.violations.join(", ") || "unknown"}`);
    } catch (error) {
      lastError = error;
    }
  }

  console.warn(`Vela ${mode} speech renderer failed after retry; using fallback`, lastError);
  const normalizedSafety = normalizeSafety(safety);
  if (normalizedSafety.isHighStakes) {
    return { speech: buildHighStakesSpeechFallback(normalizedSafety), status: "safe-fallback", attempts: 2 };
  }

  const speech = lastSpeech || fallbackSpeech(fallback);
  return {
    speech,
    status: speech.fallbackFields?.length === 1 ? "partial-fallback" : "fallback",
    attempts: 2,
  };
}

export function speechRecordForStorage(value) {
  if (!value || typeof value !== "object") return null;
  const overview = String(value.overview || "").trim();
  const narrative = String(value.narrative || "").trim();
  if (!overview || !narrative) return null;
  return {
    version: String(value.version || VELA_SPEECH_VERSION),
    status: String(value.status || "legacy"),
    attempts: Math.max(0, Number(value.attempts || 0)),
    fallbackFields: Array.isArray(value.fallbackFields) ? value.fallbackFields.map(String) : [],
    violations: Array.isArray(value.violations) ? value.violations.map(String) : [],
    safeFallback: Boolean(value.safeFallback),
    overview,
    narrative,
  };
}
