const DREAM_PATTERNS = [
  /(夢到|夢見|夢中|夢裡|夢境|怪夢|惡夢|噩夢|睡夢)/u,
  /做(?:了|過|個|一個|一場)?[^，。！？\n]{0,8}夢/u,
  /(?:昨晚|昨天晚上|昨夜|睡覺|睡著)[^，。！？\n]{0,18}夢/u,
];

export function isDreamIntent(message) {
  const text = String(message || "").trim();
  return DREAM_PATTERNS.some((pattern) => pattern.test(text));
}

export function recommendExperience(message) {
  const text = String(message || "").trim();
  const dreamLike = isDreamIntent(text);
  const astrologyLike = /(今天|今日|本週|這週|這星期|這禮拜|運勢|星座|生日|整體.*節奏|近期.*狀態)/u.test(text);

  if (dreamLike) {
    return {
      mode: "dream",
      eyebrow: "VELA 建議 · 解夢",
      title: "這件事比較適合先從夢的內容開始看。",
      message: "你在意的是夢本身帶來的感受與象徵，所以我會優先從夢裡實際出現的人物、場景、動作與情緒開始整理。解讀會引用可追溯的歷史心理學來源，但不會把任何符號硬套成唯一答案。",
    };
  }

  if (astrologyLike) {
    return {
      mode: "astrology",
      eyebrow: "VELA 建議 · 星座",
      title: "這比較像是在看一段時間的整體節奏。",
      message: "你不是只問一個單一事件，而是想知道今天或這一週的整體狀態，這種問題比較適合星座運勢。星座功能會用固定的星象計算與可追溯來源來解讀，不會讓模型自己發明天空位置。",
    };
  }

  return {
    mode: "tarot",
    eyebrow: "VELA 建議 · 塔羅",
    title: "這件事比較適合用塔羅把問題拆開來看。",
    message: "你問的是一個具體的猶豫、關係或下一步。這類問題用牌陣看現況、阻礙和建議會比較清楚，而且塔羅目前已經有 Waite 與 Mathers 的來源可以追溯。",
  };
}
