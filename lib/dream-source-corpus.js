export const DREAM_BOOKS = Object.freeze({
  freud: Object.freeze({
    id: "freud-interpretation-1913",
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
    "先問這個人物、地方、物件對使用者本人代表什麼，再提出可能的象徵連結。",
  ),
  manifestLatent: principle(
    "manifest-latent",
    DREAM_BOOKS.freud.id,
    "Manifest dream-content and latent dream-thoughts",
    "夢的表面內容與可能意義要分開",
    "記得的夢境畫面是表面內容；任何 deeper interpretation 都只是由分析建立的假說。",
    "Vela 必須先忠實重述夢裡發生什麼，再把解讀標示為可能性，不把推論寫成事實。",
  ),
  condensation: principle(
    "condensation",
    DREAM_BOOKS.freud.id,
    "The dream-work: condensation",
    "濃縮",
    "一個夢中元素可能同時承載多個人物、事件或想法的痕跡。",
    "當同一物件或人物同時連到多個現實議題時，可以提出『它可能把幾件事疊在一起』的假說。",
  ),
  displacement: principle(
    "displacement",
    DREAM_BOOKS.freud.id,
    "The dream-work: displacement",
    "移置",
    "夢中的情緒強度與現實事件的重要性未必一一對應；注意力可能移到較安全或較間接的形象。",
    "若夢中小事帶來很強烈的情緒，可以提醒使用者觀察這份感受是否也出現在別的現實情境。",
  ),
  dayResidue: principle(
    "day-residue",
    DREAM_BOOKS.freud.id,
    "Recent impressions and waking-life material in dreams",
    "近期生活素材",
    "夢常會吸收近期看過、想過或經歷過的素材。",
    "優先檢查最近幾天的事件、對話、壓力與期待，再考慮較抽象的象徵。",
  ),
  symbolicMotif: principle(
    "symbolic-motif",
    DREAM_BOOKS.jung.id,
    "Symbolic and mythological motifs in unconscious fantasy",
    "重複意象與象徵主題",
    "反覆出現的形象可以被視為一個需要理解的心理主題，但不能脫離個人脈絡直接指定唯一意思。",
    "把反覆的路、門、水、追逐、墜落、動物等當成『值得追問的主題』，而不是固定吉凶字典。",
  ),
  compensation: principle(
    "compensation",
    DREAM_BOOKS.jung.id,
    "Compensatory relation between conscious attitude and unconscious material",
    "補償性視角",
    "夢可以被當成對清醒時過度單一立場的一種補充或反向提醒。",
    "若使用者白天一直壓住某種感受，可以把夢看成邀請他注意被忽略的另一面，但不能宣稱這就是唯一原因。",
  ),
});

export const DREAM_THEME_EVIDENCE = Object.freeze({
  pursuit: ["personalAssociations", "displacement", "symbolicMotif"],
  falling: ["personalAssociations", "symbolicMotif", "dayResidue"],
  water: ["personalAssociations", "symbolicMotif", "compensation"],
  travel: ["personalAssociations", "symbolicMotif", "dayResidue"],
  schoolWork: ["personalAssociations", "dayResidue", "condensation"],
  relationship: ["personalAssociations", "condensation", "dayResidue"],
  homeFamily: ["personalAssociations", "condensation", "compensation"],
  trappedLost: ["personalAssociations", "displacement", "symbolicMotif"],
  bodyExposure: ["personalAssociations", "displacement", "dayResidue"],
  deathLoss: ["personalAssociations", "manifestLatent", "symbolicMotif"],
  general: ["personalAssociations", "manifestLatent", "dayResidue"],
});

export const DREAM_SOURCE_GUARDRAILS = Object.freeze([
  "不要使用一對一的固定夢境符號字典；個人聯想與現實脈絡優先。",
  "不要把 Freud 或 Jung 的歷史理論說成現代臨床定論。",
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
