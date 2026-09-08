export const DREAM_BOOKS = Object.freeze({
  freud: Object.freeze({
    id: "freud-interpretation-1913",
    slug: "freud-interpretation-of-dreams-1913",
    title: "The Interpretation of Dreams",
    author: "Sigmund Freud",
    edition: "Authorized English translation of the third edition (Macmillan, 1913)",
    sourceUrl: "https://www.gutenberg.org/ebooks/66048",
  }),
  jung: Object.freeze({
    id: "jung-psychology-unconscious-1916",
    title: "Psychology of the Unconscious",
    author: "C. G. Jung",
    edition: "English translation by Beatrice M. Hinkle (1916)",
    sourceUrl: "https://www.gutenberg.org/ebooks/65903",
  }),
});

export const DREAM_SOURCE_METHOD = Object.freeze({
  mode: "curated-public-domain-principles",
  fallbackMode: "curated-public-domain-principles",
  fullRagMode: "freud-full-book-rag",
  primaryBookId: DREAM_BOOKS.freud.id,
  primaryBookSlug: DREAM_BOOKS.freud.slug,
  note: "若 Freud 全文已完成向量索引，Vela 會先檢索《The Interpretation of Dreams》原文片段再解讀；若索引尚未建立，才退回人工整理、可追溯的 Freud 原則。",
  fallbackNote: "目前這次解讀沒有取得 Freud 全文檢索片段，因此退回人工整理、可追溯到 Freud 1913 公版英譯本的解夢原則。",
  fullRagNote: "這次解讀已先從 Freud 1913 公版英譯本《The Interpretation of Dreams》的全文向量索引檢索相關原文片段，再由 Vela 結合你的夢境內容整理。",
});

const principle = (id, sourceId, sourceLocation, label, text, use) => Object.freeze({
  id, sourceId, sourceLocation, label, principle: text, velaUse: use,
});

export const DREAM_CORE_EVIDENCE = Object.freeze({
  personalAssociations: principle(
    "personal-associations",
    DREAM_BOOKS.freud.id,
    "Method of dream interpretation; association-based analysis",
    "個人聯想優先",
    "夢的元素需要放回做夢者自己的聯想與生活脈絡理解，不能只靠固定符號表。",
    "先從使用者實際記得的畫面開始；如果需要延伸，也只把個人聯想當成可選的下一步，不要求先補完所有背景。",
  ),
  manifestLatent: principle(
    "manifest-latent",
    DREAM_BOOKS.freud.id,
    "Manifest dream-content and latent dream-thoughts",
    "夢的表面內容與可能意義要分開",
    "記得的夢境畫面是表面內容；任何 deeper interpretation 都只是由分析建立的假說。",
    "Vela 必須先忠實看使用者實際記得什麼，再把解讀寫成可能性，不把推論寫成事實。",
  ),
  condensation: principle(
    "condensation",
    DREAM_BOOKS.freud.id,
    "The dream-work: condensation",
    "濃縮",
    "一個夢中元素可能同時承載多個人物、事件或想法的痕跡。",
    "當一個形象可能同時碰到多種感受時，可以提出『它也許把幾件事疊在一起』的假說。",
  ),
  displacement: principle(
    "displacement",
    DREAM_BOOKS.freud.id,
    "The dream-work: displacement",
    "移置",
    "夢中的情緒強度與現實事件的重要性未必一一對應；注意力可能移到較安全或較間接的形象。",
    "若一個看似普通的夢中形象特別鮮明，可以把它看成情緒被集中到某個畫面的可能性，但不能直接指定它代表哪件事。",
  ),
  dayResidue: principle(
    "day-residue",
    DREAM_BOOKS.freud.id,
    "Recent impressions and waking-life material in dreams",
    "近期生活素材",
    "夢常會吸收近期看過、想過或經歷過的素材。",
    "若使用者沒有提供現實背景，只能用條件語氣提醒：最近若剛好有相似感受或素材，可能值得對照，不能替他編造事件。",
  ),
  symbolicMotif: principle(
    "symbolic-motif",
    DREAM_BOOKS.jung.id,
    "Symbolic and mythological motifs in unconscious fantasy",
    "重複意象與象徵主題",
    "反覆出現的形象可以被視為一個需要理解的心理主題，但不能脫離個人脈絡直接指定唯一意思。",
    "這是可選的次要歷史視角；只有未來明確需要 Jung 補充時才使用，不作為目前預設解夢來源。",
  ),
  compensation: principle(
    "compensation",
    DREAM_BOOKS.jung.id,
    "Compensatory relation between conscious attitude and unconscious material",
    "補償性視角",
    "夢可以被當成對清醒時過度單一立場的一種補充或反向提醒。",
    "這是可選的次要歷史視角；目前預設解夢不自動套用。",
  ),
});

// Phase 8 defaults to Freud. Jung remains registered for a future explicit
// secondary-framework option, but is never auto-selected by theme.
export const DREAM_THEME_EVIDENCE = Object.freeze({
  pursuit: ["personalAssociations", "displacement", "dayResidue"],
  falling: ["personalAssociations", "displacement", "dayResidue"],
  water: ["personalAssociations", "condensation", "dayResidue"],
  travel: ["personalAssociations", "displacement", "dayResidue"],
  schoolWork: ["personalAssociations", "dayResidue", "condensation"],
  relationship: ["personalAssociations", "condensation", "dayResidue"],
  homeFamily: ["personalAssociations", "condensation", "dayResidue"],
  trappedLost: ["personalAssociations", "displacement", "condensation"],
  bodyExposure: ["personalAssociations", "displacement", "dayResidue"],
  deathLoss: ["personalAssociations", "manifestLatent", "condensation"],
  general: ["personalAssociations", "manifestLatent", "dayResidue"],
});

export const DREAM_SOURCE_GUARDRAILS = Object.freeze([
  "不要使用一對一的固定夢境符號字典；個人聯想與現實脈絡優先。",
  "Freud 是目前預設的歷史解讀框架；不要把他的理論說成現代臨床定論。",
  "不要宣稱夢證明創傷、疾病、隱藏慾望、未來事件、超自然訊息或他人的真實意圖。",
  "可以提出多個解讀假說，但必須用『可能』『也許』『值得留意』等不確定語氣。",
  "若夢境帶有高度不安內容，重點放在情緒安定與現實支持，而不是加強象徵的宿命感。",
]);

export function getDreamEvidenceByKeys(keys = []) {
  const unique = [...new Set(["personalAssociations", "manifestLatent", ...keys])];
  return unique.map((key) => DREAM_CORE_EVIDENCE[key]).filter(Boolean);
}

export function publicDreamEvidence(items = []) {
  return items.map((item) => {
    const book = Object.values(DREAM_BOOKS).find((entry) => entry.id === item.sourceId);
    return {
      id: item.id,
      label: item.label,
      principle: item.principle,
      velaUse: item.velaUse,
      source: book ? {
        id: book.id,
        title: book.title,
        author: book.author,
        edition: book.edition,
        sourceUrl: book.sourceUrl,
        location: item.sourceLocation,
      } : null,
    };
  });
}
