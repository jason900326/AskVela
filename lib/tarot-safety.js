const CATEGORY_PATTERNS = Object.freeze({
  medical: /(?:醫療|健康|疾病|生病|症狀|診斷|治療|手術|懷孕|流產|癌症|藥物|medic(?:al|ine)|diagnos|pregnan|cancer|surgery)/iu,
  legal: /(?:法律|訴訟|官司|犯罪|報警|起訴|判刑|律師|legal|lawsuit|crime|arrest|court)/iu,
  financial: /(?:投資|股票|加密貨幣|期貨|選擇權|買進|賣出|借貸|破產|investment|stock|crypto|futures|bankrupt)/iu,
  crisis: /(?:自殺|輕生|傷害自己|不想活|殺人|傷害別人|suicid|self[- ]?harm|kill myself|hurt (?:myself|someone))/iu,
});

const NOTICES = Object.freeze({
  medical: "若問題涉及健康、疾病或懷孕，請以合格醫療專業人員的評估為準。",
  legal: "若問題涉及法律權利、犯罪或訴訟，請諮詢合格法律專業人員。",
  financial: "若問題涉及投資或重大財務決策，請依可靠資料評估，必要時諮詢合格專業人員。",
  crisis: "若你或他人正處於立即危險，請先聯絡當地緊急服務、危機支援或可信任的人；不要以塔羅解讀取代即時協助。",
});

export function classifyHighStakesQuestion(question) {
  const text = String(question || "").normalize("NFKC");
  const categories = Object.entries(CATEGORY_PATTERNS)
    .filter(([, pattern]) => pattern.test(text))
    .map(([category]) => category);

  return {
    isHighStakes: categories.length > 0,
    categories,
    notices: categories.map((category) => NOTICES[category]),
  };
}

