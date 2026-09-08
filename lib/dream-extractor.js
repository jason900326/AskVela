const EMOTION_RULES = Object.freeze([
  ["fear", /(害怕|恐怖|恐懼|驚嚇|嚇醒|怕|惡夢|噩夢|panic|scared|afraid)/iu],
  ["anxiety", /(焦慮|緊張|不安|擔心|趕不上|來不及|壓力|anxious|worry)/iu],
  ["sadness", /(難過|悲傷|哭|失落|孤單|寂寞|sad|cry)/iu],
  ["grief", /(過世|去世|死亡|死掉|亡者|喪|想念.*死|grief|deceased)/iu],
  ["anger", /(生氣|憤怒|吵架|爭吵|討厭|angry|fight)/iu],
  ["joy", /(開心|快樂|安心|放鬆|幸福|興奮|joy|happy|relief)/iu],
  ["confusion", /(困惑|奇怪|莫名|混亂|搞不懂|迷路|confus)/iu],
]);

const THEME_RULES = Object.freeze([
  ["recurring", /(一直夢到|重複夢到|又夢到|常常夢到|反覆|同一個夢|recurring|again and again)/iu],
  ["pursuit", /(追我|被追|追趕|逃跑|逃走|躲起來|chase|chasing|escape)/iu],
  ["falling", /(墜落|掉下去|跌下|往下掉|falling|fell)/iu],
  ["flying", /(飛起來|飛行|漂浮|浮在空中|flying|float)/iu],
  ["death", /(死亡|死掉|過世|去世|死人|亡者|dead|death|deceased)/iu],
  ["school", /(學校|考試|上課|教室|老師|同學|畢業|school|exam|classroom)/iu],
  ["work", /(工作|上班|公司|老闆|主管|同事|office|work|boss)/iu],
  ["relationship", /(男友|女友|伴侶|前任|曖昧|戀人|老公|老婆|朋友|家人|relationship|partner|ex)/iu],
  ["transition", /(搬家|離開|錯過|車站|火車|飛機|門|道路|轉彎|畢業|換工作|move|station|train|door|road)/iu],
  ["loss-control", /(失控|煞不住|停不下來|動不了|說不出話|趕不上|來不及|lose control|can't move)/iu],
]);

const SYMBOL_RULES = Object.freeze([
  ["water", /(水|海|河|湖|淹水|下雨|游泳|ocean|sea|river|water)/iu],
  ["house", /(房子|家裡|房間|屋子|公寓|house|home|room)/iu],
  ["vehicle", /(火車|捷運|車子|汽車|公車|飛機|船|train|car|bus|plane|ship)/iu],
  ["animal", /(狗|貓|蛇|鳥|蟲|蜘蛛|老鼠|動物|dog|cat|snake|bird|spider|animal)/iu],
  ["teeth", /(牙齒|掉牙|牙掉|tooth|teeth)/iu],
  ["phone", /(手機|電話|訊息|phone|message)/iu],
  ["money", /(錢|鈔票|硬幣|money|cash)/iu],
  ["door", /(門|入口|出口|door|gate)/iu],
  ["path", /(路|道路|走廊|樓梯|path|road|corridor|stairs)/iu],
  ["darkness", /(黑暗|很黑|關燈|dark|darkness)/iu],
  ["light", /(光|亮起來|太陽|燈|light|sun)/iu],
  ["person", /(媽媽|爸爸|父親|母親|朋友|同學|同事|前任|男友|女友|老公|老婆|陌生人|人影|person|friend|mother|father)/iu],
]);

function matchingIds(text, rules) {
  return rules.filter(([, pattern]) => pattern.test(text)).map(([id]) => id);
}

export function normalizeDreamText(value, maxLength = 3000) {
  return String(value || "").replace(/\s+/gu, " ").trim().slice(0, maxLength);
}

export function extractDreamFeatures(dreamText) {
  const text = normalizeDreamText(dreamText);
  const emotions = matchingIds(text, EMOTION_RULES);
  const themes = matchingIds(text, THEME_RULES);
  const symbols = matchingIds(text, SYMBOL_RULES);
  const tags = new Set(["general"]);
  for (const item of [...emotions, ...themes, ...symbols]) tags.add(item);
  if (symbols.length) tags.add("symbolism");
  if (/(奇怪|跳來跳去|突然|片段|斷掉|莫名|strange|fragment)/iu.test(text)) tags.add("fragmented");
  if (/(以前|小時候|高中|國中|大學|童年|從前|past|childhood)/iu.test(text)) tags.add("past");
  if (/(夢裡很真|很真實|超真實|清楚|vivid)/iu.test(text)) tags.add("vivid");

  return {
    emotions,
    themes,
    symbols,
    tags: [...tags].sort(),
    recurring: themes.includes("recurring"),
    characterCount: text.length,
  };
}
