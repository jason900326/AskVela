from pathlib import Path
import json
import re

ROOT = Path('.')
APP = ROOT / 'mobile' / 'App.js'
API = ROOT / 'mobile' / 'vela-api.js'
CARDS_JSON = ROOT / 'data' / 'tarot' / 'cards.json'
ASSET_OUT = ROOT / 'mobile' / 'tarot-assets.js'


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, found {count}')
    return text.replace(old, new, 1)


def replace_regex(text, pattern, replacement, label):
    result, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 regex match, found {count}')
    return result

# ---------- Generate a static Expo asset registry for all 78 card faces ----------
cards = json.loads(CARDS_JSON.read_text(encoding='utf-8'))
rank_number = {
    'ace': '01', 'two': '02', 'three': '03', 'four': '04', 'five': '05',
    'six': '06', 'seven': '07', 'eight': '08', 'nine': '09', 'ten': '10',
    'page': '11', 'knight': '12', 'queen': '13', 'king': '14',
}
major_the = {
    'fool', 'magician', 'high-priestess', 'empress', 'emperor', 'hierophant',
    'lovers', 'chariot', 'hermit', 'hanged-man', 'devil', 'tower', 'star',
    'moon', 'sun', 'world',
}

entries = []
for card in cards:
    card_id = card['card_id']
    if card['arcana'] == 'major':
        raw = card_id.removeprefix('major-')
        number, slug = raw.split('-', 1)
        filename_slug = f'the-{slug}' if slug in major_the else slug
        rel = f'./assets/tarot/major/{number}-{filename_slug}.webp'
    else:
        suit = card['suit']
        rank = card['number_or_rank']
        rel = f'./assets/tarot/{suit}/{rank_number[rank]}-{rank}-of-{suit}.webp'
    if not (ROOT / 'mobile' / rel.removeprefix('./')).exists():
        raise SystemExit(f'Missing tarot asset for {card_id}: {rel}')
    entries.append((card_id, rel))

asset_lines = [
    "export const CARD_BACK = require('./assets/tarot/card-back.png');",
    '',
    'export const TAROT_CARD_IMAGES = Object.freeze({',
]
for card_id, rel in entries:
    asset_lines.append(f"  '{card_id}': require('{rel}'),")
asset_lines += ['});', '']
ASSET_OUT.write_text('\n'.join(asset_lines), encoding='utf-8')

# ---------- Preserve draw metadata needed for local card art ----------
api = API.read_text(encoding='utf-8')
api = replace_once(
    api,
    "    english: card.nameEn || '',\n    reversed: card.orientation === 'reversed',",
    "    english: card.nameEn || '',\n    arcana: card.arcana || '',\n    suit: card.suit || '',\n    numberOrRank: card.numberOrRank || '',\n    reversed: card.orientation === 'reversed',",
    'normalize draw metadata',
)
API.write_text(api, encoding='utf-8')

# ---------- App wiring ----------
app = APP.read_text(encoding='utf-8')
app = replace_once(app, "  Image,\n  Pressable,", "  Image,\n  Linking,\n  Pressable,", 'Linking import')
app = replace_once(
    app,
    "  LIVE_READING_ENABLED,\n  drawTarotReading,",
    "  LIVE_READING_ENABLED,\n  VELA_API_BASE_URL,\n  drawTarotReading,",
    'API base URL import',
)
app = replace_once(
    app,
    "} from './vela-api';\n\nconst VELA_ART = {",
    "} from './vela-api';\nimport { CARD_BACK, TAROT_CARD_IMAGES } from './tarot-assets';\n\nconst HOME_ART = {\n  idle: require('./assets/vela/home/idle-home.png'),\n  notice: require('./assets/vela/home/notice.png'),\n};\n\nconst TAROT_ROOM = require('./assets/backgrounds/tarot-room.png');\n\nconst VELA_ART = {",
    'asset imports',
)
app = replace_once(
    app,
    "  clarifier: require('./assets/vela/clarifier.png'),\n};",
    "  clarifier: require('./assets/vela/clarifier.png'),\n  bye: require('./assets/vela/bye.png'),\n};",
    'bye art',
)
app = replace_once(
    app,
    "  FOLLOWUP: 'followup',\n  SUPPLEMENT: 'supplement',",
    "  FOLLOWUP: 'followup',\n  SUPPLEMENT: 'supplement',\n  WRAP_UP: 'wrap-up',\n  GOODBYE: 'goodbye',",
    'ending phases',
)

# Give mock cards real major-arcana ids so card art also works offline.
old_pool = re.search(r"const TAROT_POOL = \[.*?\n\];", app, flags=re.S)
if not old_pool:
    raise SystemExit('TAROT_POOL not found')
major_rows = [
    ('major-00-fool','愚者','The Fool'), ('major-01-magician','魔術師','The Magician'),
    ('major-02-high-priestess','女祭司','The High Priestess'), ('major-03-empress','皇后','The Empress'),
    ('major-04-emperor','皇帝','The Emperor'), ('major-05-hierophant','教皇','The Hierophant'),
    ('major-06-lovers','戀人','The Lovers'), ('major-07-chariot','戰車','The Chariot'),
    ('major-08-strength','力量','Strength'), ('major-09-hermit','隱者','The Hermit'),
    ('major-10-wheel-of-fortune','命運之輪','Wheel of Fortune'), ('major-11-justice','正義','Justice'),
    ('major-12-hanged-man','倒吊人','The Hanged Man'), ('major-13-death','死神','Death'),
    ('major-14-temperance','節制','Temperance'), ('major-15-devil','惡魔','The Devil'),
    ('major-16-tower','高塔','The Tower'), ('major-17-star','星星','The Star'),
    ('major-18-moon','月亮','The Moon'), ('major-19-sun','太陽','The Sun'),
    ('major-20-judgement','審判','Judgement'), ('major-21-world','世界','The World'),
]
pool_text = 'const TAROT_POOL = [\n' + ''.join(
    f"  ['{cid}', '{zh}', '{en}'],\n" for cid, zh, en in major_rows
) + '];'
app = app[:old_pool.start()] + pool_text + app[old_pool.end():]
app = replace_once(
    app,
    "  return shuffled.map(([name, english], index) => ({\n    id: `mock-${Date.now()}-${index}`,\n    cardId: `mock-${index}`,",
    "  return shuffled.map(([cardId, name, english], index) => ({\n    id: `mock-${Date.now()}-${index}`,\n    cardId,",
    'mock card ids',
)

# Replace stage with real daily scene, work room, and real character art. No decorative moons.
new_stage = r'''function VelaStage({ phase, speech, idleScene, pose = 'ready' }) {
  const curtain = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (phase !== PHASE.CURTAIN) {
      curtain.setValue(0);
      return;
    }
    Animated.timing(curtain, { toValue: 1, duration: 620, useNativeDriver: true }).start();
  }, [phase, curtain]);

  const daily = phase === PHASE.IDLE || phase === PHASE.NOTICE || phase === PHASE.CURTAIN;
  const homeArt = phase === PHASE.IDLE ? HOME_ART.idle : HOME_ART.notice;
  const art = VELA_ART[pose] || VELA_ART.ready;
  const leftX = curtain.interpolate({ inputRange: [0, 1], outputRange: [-210, 0] });
  const rightX = curtain.interpolate({ inputRange: [0, 1], outputRange: [210, 0] });

  return (
    <View style={[styles.stage, !daily && styles.stageTarot]}>
      {daily ? (
        <Image
          source={homeArt}
          resizeMode="cover"
          style={styles.stageBackground}
          accessibilityLabel={`Vela · ${phase === PHASE.IDLE ? idleScene?.label || '待機' : '注意到玩家'}`}
        />
      ) : (
        <>
          <Image source={TAROT_ROOM} resizeMode="cover" style={styles.stageBackground} />
          <View pointerEvents="none" style={styles.stageShade} />
          <View pointerEvents="none" style={styles.velaPortraitWrap}>
            <Image source={art} resizeMode="contain" style={styles.velaPortrait} accessibilityLabel={`Vela · ${pose}`} />
          </View>
        </>
      )}

      <View style={styles.speechBubble}>
        <Text style={styles.speakerTag}>VELA</Text>
        <Text style={styles.speech}>{speech}</Text>
      </View>

      {phase === PHASE.CURTAIN && (
        <View pointerEvents="none" style={styles.curtainLayer}>
          <Animated.View style={[styles.curtainPanel, styles.curtainLeft, { transform: [{ translateX: leftX }] }]} />
          <Animated.View style={[styles.curtainPanel, styles.curtainRight, { transform: [{ translateX: rightX }] }]} />
          <Text style={styles.curtainCopy}>{speech}</Text>
        </View>
      )}
    </View>
  );
}

function cardArt(card) {
  return card?.cardId ? TAROT_CARD_IMAGES[card.cardId] : null;
}

function CardArt({ card, style, reversed = card?.reversed, resizeMode = 'contain' }) {
  const source = cardArt(card);
  if (!source) return null;
  return (
    <Image
      source={source}
      resizeMode={resizeMode}
      style={[style, reversed && styles.reversedCardArt]}
      accessibilityLabel={`${card?.name || '塔羅牌'}・${reversed ? '逆位' : '正位'}`}
    />
  );
}
'''
app = replace_regex(app, r"function VelaStage\(.*?\n}\n\nfunction BackCard", new_stage + '\nfunction BackCard', 'VelaStage')

new_back = r'''function BackCard({ selected, special, onPress, index, disabled }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`第 ${index + 1} 張牌`}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.card,
        selected && styles.cardSelected,
        special && styles.businessCard,
        pressed && !disabled && styles.cardPressed,
      ]}
    >
      <Image source={CARD_BACK} resizeMode="cover" style={styles.cardBackImage} />
      {special && <View pointerEvents="none" style={styles.businessCardHint} />}
    </Pressable>
  );
}
'''
app = replace_regex(app, r"function BackCard\(.*?\n}\n\nfunction RevealCard", new_back + '\nfunction RevealCard', 'BackCard')

new_reveal = r'''function RevealCard({ card, revealed, canReveal, onPress, lockedHint = '先翻前一張' }) {
  const source = cardArt(card);
  return (
    <Pressable
      onPress={onPress}
      disabled={!canReveal || revealed}
      style={({ pressed }) => [
        styles.revealCard,
        revealed && styles.revealCardOpen,
        pressed && canReveal && !revealed && styles.cardPressed,
      ]}
    >
      {revealed ? (
        source ? (
          <>
            <CardArt card={card} style={styles.revealCardArt} />
            <View style={styles.revealMeta}>
              <Text style={styles.revealName}>{card.name}</Text>
              <Text style={styles.orientation}>{card.reversed ? '逆位' : '正位'}</Text>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.revealName}>{card.name}</Text>
            <Text style={styles.revealEnglish}>{card.english}</Text>
            <Text style={styles.orientation}>{card.reversed ? '逆位' : '正位'}</Text>
          </>
        )
      ) : (
        <>
          <Image source={CARD_BACK} resizeMode="cover" style={styles.revealCardBack} />
          {(canReveal || lockedHint) && <Text style={styles.tapHint}>{canReveal ? '點一下翻牌' : lockedHint}</Text>}
        </>
      )}
    </Pressable>
  );
}
'''
app = replace_regex(app, r"function RevealCard\(.*?\n}\n\nfunction MiniCard", new_reveal + '\nfunction MiniCard', 'RevealCard')

new_mini_and_strip = r'''function MiniCard({ card }) {
  const source = cardArt(card);
  return (
    <View style={styles.miniCard}>
      {source ? <CardArt card={card} style={styles.miniCardArt} /> : <Text style={styles.miniCardName}>{card.name}</Text>}
      <Text style={styles.miniCardOrientation}>{card.reversed ? '逆位' : '正位'}</Text>
    </View>
  );
}

function ReadingCardStrip({ cards, activeIndex = -1 }) {
  return (
    <View style={styles.readingStrip}>
      {cards.map((card, index) => {
        const source = cardArt(card);
        const active = index === activeIndex;
        return (
          <View key={card.id} style={[styles.readingStripCard, active && styles.readingStripCardActive]}>
            {source && <CardArt card={card} style={styles.readingStripArt} />}
            <View style={styles.readingStripMeta}>
              <Text style={[styles.readingStripName, active && styles.readingStripNameActive]}>{card.name}</Text>
              <Text style={styles.readingStripOrientation}>{card.reversed ? '逆位' : '正位'}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}
'''
app = replace_regex(app, r"function MiniCard\(.*?\n}\n\nfunction ReadingCardStrip\(.*?\n}\n", new_mini_and_strip, 'mini + reading strip')

# Replace long single-block dialogue with short game-like beats and dedupe repeated opening sentences.
old_dialogue = r'''function buildReadingDialogue(resultCard, card, index) {
  const game = getGameReading(resultCard, card, index);
  return [
    game.coreJudgment,
    game.briefReason && game.briefReason !== game.coreJudgment ? game.briefReason : '',
    game.practicalFocus ? `你可以先：${game.practicalFocus}` : '',
  ].filter(Boolean).join('\n');
}
'''
new_dialogue = r'''function splitSpeech(text, sentencesPerBeat = 2) {
  const pieces = String(text || '')
    .split(/(?<=[。！？])/u)
    .map((piece) => piece.trim())
    .filter(Boolean);
  const beats = [];
  for (let index = 0; index < pieces.length; index += sentencesPerBeat) {
    beats.push(pieces.slice(index, index + sentencesPerBeat).join(''));
  }
  return beats;
}

function getReadingSegments(resultCard, card, index) {
  const game = getGameReading(resultCard, card, index);
  const core = String(game.coreJudgment || '').trim();
  let reason = String(game.briefReason || '').trim();
  if (core && reason.startsWith(core)) reason = reason.slice(core.length).trim();
  const segments = [core, ...splitSpeech(reason, 2)];
  if (game.practicalFocus) segments.push(`你可以先這樣做：${game.practicalFocus}`);
  return [...new Set(segments.filter(Boolean))];
}

function shortSynthesis(overview, narrative) {
  const beats = [String(overview || '').trim(), ...splitSpeech(narrative, 2)].filter(Boolean);
  return beats.slice(0, 2).join('\n');
}
'''
app = replace_once(app, old_dialogue, new_dialogue, 'reading dialogue beats')

# State + transitions.
app = replace_once(app, "  const [analysisCount, setAnalysisCount] = useState(1);", "  const [analysisCount, setAnalysisCount] = useState(1);\n  const [readingBeat, setReadingBeat] = useState(0);", 'reading beat state')
app = replace_once(app, "      setAnalysisCount(1);\n      setSpeech('好，先看第一張。');", "      setAnalysisCount(1);\n      setReadingBeat(0);\n      setSpeech('好，先看第一張。');", 'first reading reset')
app = replace_once(
    app,
    "    if ([PHASE.QUESTION, PHASE.REVEAL, PHASE.THINKING, PHASE.FIRST_READING, PHASE.LOGIN_GATE, PHASE.FULL_READING, PHASE.SYNTHESIS, PHASE.FOLLOWUP, PHASE.SUPPLEMENT].includes(phase)) {",
    "    if ([PHASE.QUESTION, PHASE.REVEAL, PHASE.THINKING, PHASE.FIRST_READING, PHASE.LOGIN_GATE, PHASE.FULL_READING, PHASE.SYNTHESIS, PHASE.FOLLOWUP, PHASE.SUPPLEMENT, PHASE.WRAP_UP, PHASE.GOODBYE].includes(phase)) {",
    'scroll phases',
)

old_handlers = r'''  function unlockFullReading() {
    setAnalysisCount(1);
    setSpeech('好。那我繼續講。');
    setPhase(PHASE.FULL_READING);
  }

  function continueAfterFirstReading() {
    setSpeech('後面兩張才會把這件事講完整。要我繼續嗎？');
    setPhase(PHASE.LOGIN_GATE);
  }

  function advanceFullReading() {
    if (analysisCount < 3) {
      const next = analysisCount + 1;
      setAnalysisCount(next);
      setSpeech(next === 2 ? '第二張是卡住你的地方。' : '最後一張，我覺得你要注意這裡。');
      return;
    }

    setSpeech(synthesisOverview);
    setPhase(PHASE.SYNTHESIS);
  }
'''
new_handlers = r'''  async function openLogin() {
    if (!VELA_API_BASE_URL) {
      setSpeech('登入網址還沒設定好。先用測試按鈕繼續。');
      return;
    }
    try {
      await Linking.openURL(VELA_API_BASE_URL);
    } catch {
      setSpeech('登入頁打不開。先回來用測試按鈕繼續。');
    }
  }

  function unlockFullReading() {
    setAnalysisCount(2);
    setReadingBeat(0);
    setSpeech('好。那我繼續講。');
    setPhase(PHASE.FULL_READING);
  }

  function continueAfterFirstReading() {
    const segments = getReadingSegments(interpretation?.cards?.[0], drawCards[0], 0);
    if (readingBeat < Math.max(0, segments.length - 1)) {
      setReadingBeat((value) => value + 1);
      return;
    }
    setReadingBeat(0);
    setSpeech('後面兩張才會把這件事講完整。要我繼續嗎？');
    setPhase(PHASE.LOGIN_GATE);
  }

  function advanceFullReading() {
    const cardIndex = Math.max(0, analysisCount - 1);
    const segments = getReadingSegments(interpretation?.cards?.[cardIndex], drawCards[cardIndex], cardIndex);
    if (readingBeat < Math.max(0, segments.length - 1)) {
      setReadingBeat((value) => value + 1);
      return;
    }
    if (analysisCount < 3) {
      const next = analysisCount + 1;
      setAnalysisCount(next);
      setReadingBeat(0);
      setSpeech(next === 3 ? '最後一張，我覺得你要注意這裡。' : '第二張是卡住你的地方。');
      return;
    }

    setReadingBeat(0);
    setSpeech(synthesisOverview);
    setPhase(PHASE.SYNTHESIS);
  }
'''
app = replace_once(app, old_handlers, new_handlers, 'manual reading beats')

app = replace_once(
    app,
    "    const [name, english] = TAROT_POOL[Math.floor(Math.random() * TAROT_POOL.length)];\n    setSupplementCard({ id: `supplement-${Date.now()}`, name, english, reversed: Math.random() < 0.5 });",
    "    const [cardId, name, english] = TAROT_POOL[Math.floor(Math.random() * TAROT_POOL.length)];\n    setSupplementCard({ id: `supplement-${Date.now()}`, cardId, name, english, reversed: Math.random() < 0.5 });",
    'supplement art id',
)
app = replace_once(
    app,
    "  function revealSupplement() {\n    if (!supplementCard || supplementRevealed) return;\n    Vibration.vibrate(28);\n    setSupplementRevealed(true);\n    setSpeech('……嗯，果然。');\n  }",
    "  function revealSupplement() {\n    if (!supplementCard || supplementRevealed) return;\n    Vibration.vibrate(28);\n    setSupplementRevealed(true);\n    setSpeech('……嗯，果然。這張把焦點縮小了。');\n  }\n\n  function finishSupplement() {\n    setSpeech('大概就是這樣。你還想留一下，還是今天先到這裡？');\n    setPhase(PHASE.WRAP_UP);\n  }\n\n  function stayWithVela() {\n    setFollowupAnswered(false);\n    setFollowupAnswer('');\n    setFollowupMessage('');\n    setFollowupInput('');\n    setSpeech('好，那再聊一下。你還想問什麼？');\n    setPhase(PHASE.FOLLOWUP);\n  }\n\n  function sayGoodbye() {\n    setSpeech('好。那今天先到這裡。下次見。');\n    setPhase(PHASE.GOODBYE);\n  }",
    'wrap up handlers',
)
app = replace_once(app, "    setAnalysisCount(1);\n    setFollowupInput('');", "    setAnalysisCount(1);\n    setReadingBeat(0);\n    setFollowupInput('');", 'reset reading beat')

# Stage dialogue and poses.
old_dialogue_vars = r'''  const readingDialogue = activeReadingIndex === null
    ? ''
    : buildReadingDialogue(activeResultCard, activeDrawCard, activeReadingIndex);

  const stageSpeech = phase === PHASE.CURTAIN
    ? PREPARE_LINES[prepareIndex]
    : phase === PHASE.THINKING
      ? THINKING_LINES[thinkingIndex]
      : phase === PHASE.SYNTHESIS
        ? [synthesisOverview, synthesisNarrative].filter(Boolean).join('\n')
        : phase === PHASE.FOLLOWUP && followupAnswered
          ? (followupLoading ? '……' : followupAnswer || speech)
          : phase === PHASE.SUPPLEMENT && supplementRevealed
            ? '這張沒有推翻前面三張。它只是把焦點縮小：先處理你能控制的部分，比一直猜結果更有用。'
            : readingDialogue || speech;
'''
new_dialogue_vars = r'''  const readingSegments = activeReadingIndex === null
    ? []
    : getReadingSegments(activeResultCard, activeDrawCard, activeReadingIndex);

  const stageSpeech = phase === PHASE.CURTAIN
    ? PREPARE_LINES[prepareIndex]
    : phase === PHASE.THINKING
      ? THINKING_LINES[thinkingIndex]
      : phase === PHASE.SYNTHESIS
        ? shortSynthesis(synthesisOverview, synthesisNarrative)
        : phase === PHASE.FOLLOWUP && followupAnswered
          ? (followupLoading ? '……' : followupAnswer || speech)
          : phase === PHASE.SUPPLEMENT && supplementRevealed
            ? '這張沒有推翻前面三張。它只是把焦點縮小：先處理你能控制的部分。'
            : readingSegments[readingBeat] || speech;
'''
app = replace_once(app, old_dialogue_vars, new_dialogue_vars, 'stage speech beats')

app = replace_once(
    app,
    "        : phase === PHASE.SUPPLEMENT\n          ? (supplementRevealed ? 'clarifier' : 'reading')\n          : [PHASE.FIRST_READING, PHASE.LOGIN_GATE, PHASE.FULL_READING, PHASE.SYNTHESIS].includes(phase)\n            ? 'reading'\n            : 'ready';",
    "        : phase === PHASE.SUPPLEMENT\n          ? (supplementRevealed ? 'clarifier' : 'reading')\n          : phase === PHASE.WRAP_UP\n            ? 'asking'\n            : phase === PHASE.GOODBYE\n              ? 'bye'\n              : [PHASE.FIRST_READING, PHASE.LOGIN_GATE, PHASE.FULL_READING, PHASE.SYNTHESIS].includes(phase)\n                ? 'reading'\n                : 'ready';",
    'ending poses',
)

# Login gate gets a real web link plus explicit prototype resume control.
old_login_ui = r'''        {phase === PHASE.LOGIN_GATE && (
          <View style={styles.tableSection}>
            <ReadingCardStrip cards={drawCards} activeIndex={0} />
            <Pressable style={styles.primaryButton} onPress={unlockFullReading}>
              <Text style={styles.primaryButtonText}>登入並繼續</Text>
            </Pressable>
          </View>
        )}
'''
new_login_ui = r'''        {phase === PHASE.LOGIN_GATE && (
          <View style={styles.tableSection}>
            <ReadingCardStrip cards={drawCards} activeIndex={0} />
            <Pressable style={styles.primaryButton} onPress={openLogin}>
              <Text style={styles.primaryButtonText}>前往登入</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={unlockFullReading}>
              <Text style={styles.secondaryButtonText}>我已登入，繼續</Text>
            </Pressable>
          </View>
        )}
'''
app = replace_once(app, old_login_ui, new_login_ui, 'login UI')

# Buttons use short dialogue beats; supplement now flows to a separate wrap-up scene.
app = replace_once(
    app,
    "              <Text style={styles.primaryButtonText}>繼續聽 Vela 說</Text>",
    "              <Text style={styles.primaryButtonText}>{readingBeat < Math.max(0, readingSegments.length - 1) ? '繼續' : '聽完第一張'}</Text>",
    'first reading label',
)
app = replace_once(
    app,
    "              <Text style={styles.primaryButtonText}>{analysisCount < 3 ? '繼續聽下一張' : '把三張串起來'}</Text>",
    "              <Text style={styles.primaryButtonText}>{readingBeat < Math.max(0, readingSegments.length - 1) ? '繼續' : analysisCount < 3 ? '聽下一張' : '把三張串起來'}</Text>",
    'full reading label',
)
app = replace_once(
    app,
    "            {supplementRevealed && (\n              <Pressable style={styles.primaryButton} onPress={resetReading}>\n                <Text style={styles.primaryButtonText}>今天先到這裡</Text>\n              </Pressable>\n            )}",
    "            {supplementRevealed && (\n              <Pressable style={styles.primaryButton} onPress={finishSupplement}>\n                <Text style={styles.primaryButtonText}>聽 Vela 說完</Text>\n              </Pressable>\n            )}",
    'supplement finish button',
)

ending_ui = r'''

        {phase === PHASE.WRAP_UP && (
          <View style={styles.tableSection}>
            <Pressable style={styles.primaryButton} onPress={stayWithVela}>
              <Text style={styles.primaryButtonText}>再聊一下</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={sayGoodbye}>
              <Text style={styles.secondaryButtonText}>今天先到這裡</Text>
            </Pressable>
          </View>
        )}

        {phase === PHASE.GOODBYE && (
          <View style={styles.tableSection}>
            <Pressable style={styles.primaryButton} onPress={resetReading}>
              <Text style={styles.primaryButtonText}>回到 Vela 的房間</Text>
            </Pressable>
          </View>
        )}
'''
app = replace_once(app, "        {phase === PHASE.SUPPLEMENT && supplementCard && (", "        {phase === PHASE.SUPPLEMENT && supplementCard && (", 'supplement anchor')
# Insert ending UI immediately before ScrollView closes.
app = replace_once(app, "        )}\n      </ScrollView>", "        )}" + ending_ui + "      </ScrollView>", 'ending UI insertion')

# ---------- Styles ----------
app = replace_once(
    app,
    "  stage: { minHeight: 458, borderRadius: 28, borderWidth: 1, borderColor: '#3B2550', backgroundColor: '#1A1025', alignItems: 'center', justifyContent: 'flex-start', overflow: 'hidden', padding: 16, paddingBottom: 126 },\n  stageTarot: { backgroundColor: '#160D20', borderColor: '#5B386D' },\n  moon: { position: 'absolute', top: 17, right: 22, color: '#D9B96E', fontSize: 31, zIndex: 3 },\n  velaPortraitWrap: { marginTop: 3, width: '96%', height: 326, alignItems: 'center', justifyContent: 'flex-end', zIndex: 1 },\n  velaPortrait: { width: '100%', height: '100%' },\n  speechBubble: { position: 'absolute', left: 16, right: 16, bottom: 16, minHeight: 92, borderRadius: 18, backgroundColor: '#F0E4F4', paddingHorizontal: 16, paddingTop: 18, paddingBottom: 14, zIndex: 5 },",
    "  stage: { minHeight: 458, borderRadius: 28, borderWidth: 1, borderColor: '#3B2550', backgroundColor: '#1A1025', alignItems: 'center', justifyContent: 'flex-start', overflow: 'hidden', padding: 16, paddingBottom: 112 },\n  stageTarot: { backgroundColor: '#160D20', borderColor: '#5B386D' },\n  stageBackground: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },\n  stageShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10, 5, 16, 0.22)', zIndex: 0 },\n  velaPortraitWrap: { marginTop: 2, width: '100%', height: 344, alignItems: 'center', justifyContent: 'flex-end', zIndex: 1 },\n  velaPortrait: { width: '100%', height: '100%' },\n  speechBubble: { position: 'absolute', left: 16, right: 16, bottom: 16, minHeight: 76, borderRadius: 17, backgroundColor: '#F0E4F4', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, zIndex: 5 },",
    'stage styles',
)
app = app.replace("  curtainMoon: { position: 'absolute', top: '35%', color: '#D9B96E', fontSize: 54, zIndex: 25 },\n", '')
app = replace_once(
    app,
    "  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },\n  card: { width: '15.2%', aspectRatio: 0.62, borderRadius: 8, borderWidth: 1, borderColor: '#6B4B77', backgroundColor: '#24142F', alignItems: 'center', justifyContent: 'center' },\n  cardSelected: { borderWidth: 2, borderColor: '#E4C6EE', transform: [{ translateY: -5 }], backgroundColor: '#3A2046' },\n  businessCard: { borderStyle: 'dashed', borderColor: '#D6B56D', backgroundColor: '#30233A' },\n  cardPressed: { opacity: 0.75, transform: [{ scale: 0.97 }] },\n  cardMoon: { color: '#D4B46D', fontSize: 18 },\n  cardIndex: { position: 'absolute', bottom: 5, color: '#795E85', fontSize: 8 },",
    "  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', rowGap: 10 },\n  card: { width: '18%', marginRight: '-1.35%', aspectRatio: 0.62, borderRadius: 8, borderWidth: 1, borderColor: '#6B4B77', backgroundColor: '#24142F', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },\n  cardSelected: { borderWidth: 2, borderColor: '#E4C6EE', transform: [{ translateY: -5 }], backgroundColor: '#3A2046' },\n  businessCard: { borderColor: '#D6B56D' },\n  businessCardHint: { ...StyleSheet.absoluteFillObject, borderWidth: 1, borderColor: 'rgba(217,185,110,0.6)', backgroundColor: 'rgba(217,185,110,0.06)' },\n  cardBackImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },\n  cardPressed: { opacity: 0.75, transform: [{ scale: 0.97 }] },",
    'draw card styles',
)
app = replace_once(
    app,
    "  revealCard: { flex: 1, minHeight: 210, borderRadius: 14, borderWidth: 1, borderColor: '#62456F', backgroundColor: '#24142F', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },\n  revealCardOpen: { backgroundColor: '#EBDFF0', borderColor: '#F8ECFB' },\n  revealMoon: { color: '#D4B46D', fontSize: 34 },",
    "  revealCard: { flex: 1, aspectRatio: 0.62, borderRadius: 14, borderWidth: 1, borderColor: '#62456F', backgroundColor: '#24142F', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },\n  revealCardOpen: { backgroundColor: '#17101F', borderColor: '#F8ECFB' },\n  revealCardArt: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },\n  revealCardBack: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },\n  revealMeta: { position: 'absolute', left: 5, right: 5, bottom: 5, borderRadius: 8, paddingVertical: 5, paddingHorizontal: 4, backgroundColor: 'rgba(16,9,24,0.82)', alignItems: 'center' },\n  reversedCardArt: { transform: [{ rotate: '180deg' }] },",
    'reveal styles',
)
app = replace_once(
    app,
    "  readingStripCard: { flex: 1, minHeight: 132, borderRadius: 14, borderWidth: 1, borderColor: '#5E416A', backgroundColor: '#24142F', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },\n  readingStripCardActive: { borderWidth: 2, borderColor: '#C99BDB', backgroundColor: '#35203F', transform: [{ translateY: -4 }] },",
    "  readingStripCard: { flex: 1, minHeight: 164, borderRadius: 14, borderWidth: 1, borderColor: '#5E416A', backgroundColor: '#24142F', alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden' },\n  readingStripCardActive: { borderWidth: 2, borderColor: '#E1BF68', backgroundColor: '#35203F', transform: [{ translateY: -4 }], shadowColor: '#E1BF68', shadowOpacity: 0.9, shadowRadius: 12, shadowOffset: { width: 0, height: 0 } },\n  readingStripArt: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },\n  readingStripMeta: { width: '100%', paddingVertical: 7, paddingHorizontal: 4, backgroundColor: 'rgba(16,9,24,0.84)', alignItems: 'center' },",
    'reading strip styles',
)
app = replace_once(
    app,
    "  miniCard: { flex: 1, minHeight: 106, borderRadius: 12, borderWidth: 1, borderColor: '#5E416A', backgroundColor: '#24142F', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },",
    "  miniCard: { flex: 1, minHeight: 126, borderRadius: 12, borderWidth: 1, borderColor: '#5E416A', backgroundColor: '#24142F', alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden' },\n  miniCardArt: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },",
    'mini card styles',
)
app = replace_once(app, "  speech: { color: '#25182C', fontSize: 15, lineHeight: 22, textAlign: 'left', fontWeight: '600' },", "  speech: { color: '#25182C', fontSize: 14.5, lineHeight: 21, textAlign: 'left', fontWeight: '600' },", 'speech style')

APP.write_text(app, encoding='utf-8')

print(f'Generated {len(entries)} tarot asset mappings and patched mobile game stage.')
