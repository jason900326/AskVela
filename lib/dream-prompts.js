export const DREAM_READING_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "title",
    "dreamSummary",
    "emotionalThread",
    "sourceObservations",
    "interpretation",
    "possibleConnections",
    "reflectionQuestions",
    "nextStep",
    "basisNote"
  ],
  properties: {
    title: { type: "string", minLength: 1, maxLength: 80 },
    dreamSummary: { type: "string", minLength: 1, maxLength: 500 },
    emotionalThread: { type: "string", minLength: 1, maxLength: 500 },
    sourceObservations: {
      type: "array",
      minItems: 2,
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["evidenceId", "observation"],
        properties: {
          evidenceId: { type: "string", minLength: 1, maxLength: 80 },
          observation: { type: "string", minLength: 1, maxLength: 500 }
        }
      }
    },
    interpretation: { type: "string", minLength: 1, maxLength: 900 },
    possibleConnections: {
      type: "array",
      minItems: 2,
      maxItems: 3,
      items: { type: "string", minLength: 1, maxLength: 260 }
    },
    reflectionQuestions: {
      type: "array",
      minItems: 2,
      maxItems: 2,
      items: { type: "string", minLength: 1, maxLength: 220 }
    },
    nextStep: { type: "string", minLength: 1, maxLength: 300 },
    basisNote: { type: "string", minLength: 1, maxLength: 500 }
  }
};

export function buildDreamInstructions() {
  return `你是 Vela，一位用繁體中文陪使用者整理夢境的解讀者。

這不是診斷、治療、預言，也不是固定符號字典。你只能使用輸入中提供的夢境內容、使用者自願提供的現實脈絡、deterministic extraction，以及 curated evidence。

規則：
1. 不可以新增夢裡沒有發生的事件、人物或情緒。
2. sourceObservations 必須明確依據 evidence，且 evidenceId 必須原樣引用輸入中的 evidence id。
3. 把歷史來源稱為「某位作者的歷史理論／觀察」，不要假裝是現代臨床共識。
4. interpretation 才是 Vela 的情境化綜合；使用「可能、也許、可以想想」等不確定措辭。
5. 不可以說「夢到 X 就代表 Y」。先以情緒、關聯、夢者自己的聯想為主。
6. 不可從夢推斷精神疾病、創傷、受虐、壓抑記憶、性傾向、犯罪意圖、懷孕、疾病或未來事件。
7. 亡者夢不可宣稱真的與亡者聯繫；可以討論想念、記憶、依附、未完成感受等可能性。
8. 若夢境包含死亡、自傷、暴力或災難，只解讀夢的內容；除非使用者的現實脈絡明確表示清醒時有立即危險，否則不要把夢中事件等同真實意圖。
9. 內容要自然、簡潔，不要把每一個物件都硬拆成象徵。
10. basisNote 要說明這次是怎麼從「夢境特徵 → 來源原則 → 情境化反思」走到結果。`;
}

export function buildDreamInput({ dreamText, contextText, extracted, evidence }) {
  return JSON.stringify({
    dream: dreamText,
    wakingContext: contextText || "（未提供）",
    extracted,
    evidence: evidence.items.map((item) => ({
      id: item.id,
      sourceId: item.sourceId,
      location: item.location,
      principle: item.principle,
      usageNote: item.usageNote,
    })),
    task: "依照來源與規則整理這個夢。先忠實摘要，再找情緒主線，只選真正有幫助的來源觀察，最後提出非決定論的情境化解讀與兩個反思問題。"
  });
}
