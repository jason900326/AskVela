export const ASTROLOGY_BOOKS = Object.freeze({
  sepharial: Object.freeze({
    id: "sepharial-1920",
    title: "Astrology: How to Make and Read Your Own Horoscope",
    author: "Sepharial",
    edition: "Revised and Enlarged Edition (1920)",
    sourceUrl: "https://www.gutenberg.org/ebooks/46963",
  }),
  alanLeo: Object.freeze({
    id: "alan-leo-1910",
    title: "Astrology for All",
    author: "Alan Leo",
    edition: "4th edition, enlarged (1910)",
    sourceUrl: "https://bibliotecaparticular.casafernandopessoa.pt/1-91",
  }),
});

const alanLeoSign = (page, themes, tensions) => Object.freeze({
  sourceId: ASTROLOGY_BOOKS.alanLeo.id,
  location: `Chapters IV–XV — Twelve Signs, p. ${page}`,
  scope: "natal_sun_sign",
  themes: Object.freeze(themes),
  tensions: Object.freeze(tensions),
});

// These are concise, source-attributed paraphrases rather than copied book prose.
// They intentionally remove physiognomy, health diagnosis, moral hierarchy, gender,
// race/nationality, fate/death, and other historical claims that AskVela must not repeat.
export const ASTROLOGY_SIGN_EVIDENCE = Object.freeze({
  aries: alanLeoSign("13–15", ["主動開路", "直接表達", "快速啟動", "追求進展"], ["容易太快行動", "需要先確認方向再投入"]),
  taurus: alanLeoSign("16–18", ["穩定累積", "耐心持續", "重視實際與品質", "建立可靠節奏"], ["不易突然改變", "需要分辨堅持與僵化"]),
  gemini: alanLeoSign("19–21", ["好奇與交流", "快速切換視角", "連結資訊", "適應變化"], ["注意力容易分散", "需要把想法收斂成可完成的下一步"]),
  cancer: alanLeoSign("22–24", ["感受與記憶", "歸屬感", "照顧與保護", "重視熟悉環境"], ["容易受氣氛牽動", "需要區分自己的感受與他人的需求"]),
  leo: alanLeoSign("25–27", ["中心感與自我表達", "創造與熱情", "忠誠投入", "希望被看見與回應"], ["需要避免把認可當成唯一動力", "適合把熱情落在具體作品或行動"]),
  virgo: alanLeoSign("28–30", ["辨別與整理", "實際方法", "改善細節", "把複雜事拆小"], ["容易把注意力卡在不足之處", "需要讓精準服務於完成而不是無止境修正"]),
  libra: alanLeoSign("31–32", ["比較與衡量", "公平與協調", "關係視角", "尋找平衡點"], ["容易因為同時看見多方立場而延後決定", "需要在協調與自身立場之間保留界線"]),
  scorpio: alanLeoSign("33–35", ["集中與深度", "持續追根究柢", "強烈投入", "轉化與重整"], ["強度過高時容易變成防衛或執著", "適合把能量用在看清核心問題而非控制結果"]),
  sagittarius: alanLeoSign("36–38", ["擴展視野", "探索與移動", "信念與學習", "把經驗連成更大的方向"], ["容易先追遠方目標而忽略當下細節", "需要把理想轉成可驗證的行動"]),
  capricorn: alanLeoSign("39–41", ["結構與責任", "耐久經營", "節制與資源配置", "一步步建立位置"], ["容易把壓力全扛在自己身上", "需要區分真正重要的責任與不必要的負擔"]),
  aquarius: alanLeoSign("42–44", ["獨立觀點", "群體與系統思考", "非傳統方法", "長時間專注於理念"], ["容易把理性距離拉得太遠", "需要讓新觀點能被別人理解與實際使用"]),
  pisces: alanLeoSign("45–47", ["感受力與想像", "同理與接收", "邊界流動", "從整體氣氛理解事情"], ["容易吸收太多外界訊號", "需要把感受轉成清楚界線與可落地選擇"]),
});

export const ASTROLOGY_CORE_EVIDENCE = Object.freeze({
  sun: Object.freeze({
    sourceId: ASTROLOGY_BOOKS.alanLeo.id,
    secondarySourceId: ASTROLOGY_BOOKS.sepharial.id,
    location: "Alan Leo, Chapter III — The Sun and the Zodiac, pp. 10–12; Sepharial, Section I Chapter I, p. 17 ff.",
    scope: "planet_principle",
    principle: "太陽在兩本書中都被當作較核心、主動、整合性的原則。AskVela把它用作太陽星座的基準傾向，而不是固定人格或命運判決。",
  }),
  moon: Object.freeze({
    sourceId: ASTROLOGY_BOOKS.alanLeo.id,
    secondarySourceId: ASTROLOGY_BOOKS.sepharial.id,
    location: "Alan Leo, Chapter XVII — The Moon and the Zodiac, pp. 63–70; Sepharial, Section I Chapter I, p. 17 ff.",
    scope: "planet_principle",
    principle: "月亮被描述為較接收、反應、變動且與感受層面相關的原則。當它是『當天行運月亮』時，只能作為當下節奏的象徵背景，不能偷換成使用者的本命月亮。",
  }),
  signSystem: Object.freeze({
    sourceId: ASTROLOGY_BOOKS.sepharial.id,
    secondarySourceId: ASTROLOGY_BOOKS.alanLeo.id,
    location: "Sepharial, Section I Chapter II — The Signs of the Zodiac, p. 24 ff.; Alan Leo, Chapter XVI, pp. 48–61",
    scope: "zodiac_structure",
    principle: "兩本書都使用十二星座、四元素以及活動/固定/變動類型來組織象徵。AskVela可用這些分類描述節奏與偏向，但不把分類變成人格定論。",
  }),
  transitMethod: Object.freeze({
    sourceId: ASTROLOGY_BOOKS.sepharial.id,
    location: "Section IV Chapter II — The Effects of Transits, p. 101 ff.",
    scope: "transit_method",
    principle: "Sepharial把 transit 定義為行運星體經過出生盤中實際 significator 位置的關係。沒有出生盤實際度數時，不能把『某星座的中心點』冒充個人的本命位置並宣稱精確相位。",
  }),
  synthesisMethod: Object.freeze({
    sourceId: ASTROLOGY_BOOKS.sepharial.id,
    location: "Section IV Chapter III — How to Summarise a Horoscope, p. 105 ff.",
    scope: "interpretation_method",
    principle: "判讀要權衡多個已知因素並以觀察到的配置為準，而不是先想好結論再找規則支撐。AskVela因此必須先列出來源原則與當天天象，再做情境化綜合。",
  }),
  natalBoundary: Object.freeze({
    sourceId: ASTROLOGY_BOOKS.alanLeo.id,
    location: "Chapter XVIII — The Soli-Lunar Combinations or Polarities, pp. 71–73",
    scope: "application_boundary",
    principle: "Alan Leo的 Sun–Moon 組合是在出生配置脈絡中討論 individual/personal character。這些內容不能直接套成『今天月亮在某星座，所以你今天就是某種人格』。",
  }),
});

export const ASTROLOGY_ASPECT_EVIDENCE = Object.freeze({
  conjunction: Object.freeze({
    sourceId: ASTROLOGY_BOOKS.sepharial.id,
    secondarySourceId: ASTROLOGY_BOOKS.alanLeo.id,
    location: "Sepharial, Section I Chapter IV — The Astronomical Aspects, p. 31; Alan Leo, Aspects, p. 62",
    historicalFrame: "兩者都把合相視為兩個因素集中在同一位置；性質要看參與的星體，而不是一律判為好或壞。",
    velaUse: "把它解成主題集中、兩股訊號疊加，提醒使用者留意哪個議題變得更明顯。",
  }),
  sextile: Object.freeze({
    sourceId: ASTROLOGY_BOOKS.sepharial.id,
    secondarySourceId: ASTROLOGY_BOOKS.alanLeo.id,
    location: "Sepharial, Section I Chapter IV, p. 31; Alan Leo, Aspects, p. 62",
    historicalFrame: "老派文本把六分相列在較和諧的相位一側。",
    velaUse: "改寫成較容易協調、可利用的連結，不承諾好事自動發生。",
  }),
  square: Object.freeze({
    sourceId: ASTROLOGY_BOOKS.sepharial.id,
    secondarySourceId: ASTROLOGY_BOOKS.alanLeo.id,
    location: "Sepharial, Section I Chapter IV, p. 31; Alan Leo, Aspects, p. 62",
    historicalFrame: "老派文本把四分相列為較緊張的相位。",
    velaUse: "改寫成摩擦、需要調整或做出取捨的訊號，不使用『邪惡』『災禍』等宿命語言。",
  }),
  trine: Object.freeze({
    sourceId: ASTROLOGY_BOOKS.sepharial.id,
    secondarySourceId: ASTROLOGY_BOOKS.alanLeo.id,
    location: "Sepharial, Section I Chapter IV, p. 31; Alan Leo, Aspects, p. 62",
    historicalFrame: "老派文本把三分相列在較和諧的相位一側。",
    velaUse: "改寫成流動較順、較容易整合的關係，但仍需要使用者自己行動。",
  }),
  opposition: Object.freeze({
    sourceId: ASTROLOGY_BOOKS.sepharial.id,
    secondarySourceId: ASTROLOGY_BOOKS.alanLeo.id,
    location: "Sepharial, Section I Chapter IV, p. 31; Alan Leo, Aspects, p. 62",
    historicalFrame: "兩個因素相隔約 180°，老派文本通常視為張力較高。",
    velaUse: "改寫成兩端拉扯、需要看見彼此與尋找平衡，不直接預言衝突或損失。",
  }),
});

export const ASTROLOGY_SOURCE_GUARDRAILS = Object.freeze([
  "不要把 Alan Leo 的本命月亮章節或 Sun–Moon 出生組合直接當成當天行運月亮的個人描述。",
  "不要把星座中心點當成使用者的精確出生太陽度數，也不要為此宣稱 exact natal aspect。",
  "只解讀輸入中實際計算出的天象；沒有計算的行星、逆行、宮位、上升、出生相位一律不得補寫。",
  "來源中的醫療診斷、死亡預言、精神疾病標籤、外貌判斷、性別本質論、民族/階級刻板印象與善惡人格分類不進入 Vela 解讀。",
  "把歷史來源的 benefic/malefic 或 good/evil aspect 語言轉成較和諧/較有張力的互動描述，不宣稱事件必然發生。",
  "每段結果都必須能回答：這是書中的哪個原則、對應到哪個當天天象、Vela 做了什麼情境化延伸。",
]);
