import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  Vibration,
  View,
} from 'react-native';
import {
  LIVE_READING_ENABLED,
  VELA_API_BASE_URL,
  drawTarotReading,
  followUpTarotReading,
  interpretTarotReading,
  makeRequestId,
  normalizeDrawCards,
} from './vela-api';
import { CARD_BACK, TAROT_CARD_IMAGES } from './tarot-assets';

const HOME_ART = {
  idle: require('./assets/vela/home/idle-home.png'),
  notice: require('./assets/vela/home/notice.png'),
};

const TAROT_ROOM = require('./assets/backgrounds/tarot-room.png');

const VELA_ART = {
  ready: require('./assets/vela/ready.png'),
  reading: require('./assets/vela/reading.png'),
  thinking: require('./assets/vela/thinking.png'),
  asking: require('./assets/vela/asking.png'),
  clarifier: require('./assets/vela/clarifier.png'),
  bye: require('./assets/vela/bye.png'),
};

const PHASE = {
  IDLE: 'idle',
  GREETING: 'greeting',
  NOTICE: 'notice',
  CURTAIN: 'curtain',
  QUESTION: 'question',
  DRAW: 'draw',
  REVEAL: 'reveal',
  THINKING: 'thinking',
  FIRST_READING: 'first-reading',
  LOGIN_GATE: 'login-gate',
  FULL_READING: 'full-reading',
  SYNTHESIS: 'synthesis',
  FOLLOWUP: 'followup',
  SUPPLEMENT: 'supplement',
  WRAP_UP: 'wrap-up',
  GOODBYE: 'goodbye',
};

const IDLE_SCENES = [
  { key: 'phone', label: '滑手機' },
  { key: 'tea', label: '發呆' },
  { key: 'book', label: '亂翻書' },
  { key: 'cat', label: '跟貓混在一起' },
  { key: 'nap', label: '快睡著了' },
];

const PREPARE_LINES = [
  '我準備一下。',
  '正在把頭髮綁起來……',
  '把桌上的垃圾藏到你看不到的地方……',
  '擺上我很珍貴的牌……',
];

const THINKING_LINES = [
  '思考你剛剛問我的問題……',
  '這三張牌的關聯是什麼？',
  '晚餐要吃什麼……',
  '好像有一張牌可以把狀況說清楚。',
];

const QUESTION_PROMPTS = [
  '感情最近有點卡住',
  '工作／學業接下來怎麼走',
  '我有一個決定一直下不了',
];

const TAROT_POOL = [
  ['major-00-fool', '愚者', 'The Fool'],
  ['major-01-magician', '魔術師', 'The Magician'],
  ['major-02-high-priestess', '女祭司', 'The High Priestess'],
  ['major-03-empress', '皇后', 'The Empress'],
  ['major-04-emperor', '皇帝', 'The Emperor'],
  ['major-05-hierophant', '教皇', 'The Hierophant'],
  ['major-06-lovers', '戀人', 'The Lovers'],
  ['major-07-chariot', '戰車', 'The Chariot'],
  ['major-08-strength', '力量', 'Strength'],
  ['major-09-hermit', '隱者', 'The Hermit'],
  ['major-10-wheel-of-fortune', '命運之輪', 'Wheel of Fortune'],
  ['major-11-justice', '正義', 'Justice'],
  ['major-12-hanged-man', '倒吊人', 'The Hanged Man'],
  ['major-13-death', '死神', 'Death'],
  ['major-14-temperance', '節制', 'Temperance'],
  ['major-15-devil', '惡魔', 'The Devil'],
  ['major-16-tower', '高塔', 'The Tower'],
  ['major-17-star', '星星', 'The Star'],
  ['major-18-moon', '月亮', 'The Moon'],
  ['major-19-sun', '太陽', 'The Sun'],
  ['major-20-judgement', '審判', 'Judgement'],
  ['major-21-world', '世界', 'The World'],
];

const FOLLOWUP_CHOICES = [
  '對，我其實一直在猶豫。',
  '我比較怕事情最後不是我想的那樣。',
  '那我現在最應該做什麼？',
];

function pickIdleScene() {
  return IDLE_SCENES[Math.floor(Math.random() * IDLE_SCENES.length)];
}

function createMockCards() {
  const shuffled = [...TAROT_POOL].sort(() => Math.random() - 0.5).slice(0, 3);
  return shuffled.map(([cardId, name, english], index) => ({
    id: `mock-${Date.now()}-${index}`,
    cardId,
    name,
    english,
    reversed: Math.random() < 0.5,
    positionLabel: ['現況', '阻礙', '建議'][index],
  }));
}

function mockCardReading(card, index) {
  const orientation = card?.reversed ? '逆位' : '正位';
  const lines = [
    `${card?.name}放在第一個位置，比較像你現在正在經歷的狀態。${orientation}讓這個訊號更值得注意。`,
    `${card?.name}落在中間，比較像真正卡住你的地方。它不只是在講好或壞，而是在指出你現在最難跨過去的那一步。`,
    `${card?.name}放在最後，比較像下一步可以留意的方向。它不是替你決定，而是把一個你可以主動處理的地方指出來。`,
  ];
  return lines[index] || `${card?.name}在這組牌裡有自己的位置。`;
}

function createMockInterpretation(cards) {
  return {
    cards: cards.map((card, index) => ({
      cardId: card.cardId,
      coreJudgment: [
        '你現在卡住的不是沒有答案，而是還不想放掉另一個可能。',
        '真正讓你停住的，比較像是對選錯之後代價的擔心。',
        '這張牌比較支持先做一個能測試方向的小動作，而不是逼自己一次決定到底。',
      ][index],
      briefReason: mockCardReading(card, index),
      recap: ['還不想放掉另一個可能', '怕的是選錯的代價', '先試一步，不用一次定終局'][index],
      contextInterpretation: mockCardReading(card, index),
      practicalFocus: ['列出你真正不想失去的那一項。', '把最怕的代價寫成可以驗證的事。', '先做一個可回頭的小測試。'][index],
    })),
    analysisSynthesis: {
      overview: '三張牌放在一起',
      narrative: '第一張描述你現在的位置，第二張指出真正的阻力，第三張則把下一步縮小到一個比較能處理的方向。',
    },
    synthesis: {
      reflectionQuestions: ['你現在真正怕的是「選錯」，還是「失去」？'],
    },
  };
}

function VelaStage({ phase, speech, idleScene, pose = 'ready' }) {
  const curtain = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (phase !== PHASE.CURTAIN) {
      curtain.setValue(0);
      return;
    }
    Animated.timing(curtain, { toValue: 1, duration: 620, useNativeDriver: true }).start();
  }, [phase, curtain]);

  const daily = [PHASE.IDLE, PHASE.GREETING, PHASE.NOTICE, PHASE.CURTAIN].includes(phase);
  const homeArt = [PHASE.NOTICE, PHASE.CURTAIN].includes(phase) ? HOME_ART.notice : HOME_ART.idle;
  const art = VELA_ART[pose] || VELA_ART.ready;
  const leftX = curtain.interpolate({ inputRange: [0, 1], outputRange: [-210, 0] });
  const rightX = curtain.interpolate({ inputRange: [0, 1], outputRange: [210, 0] });

  return (
    <View style={[styles.stage, !daily && styles.stageTarot]}>
      <View style={styles.sceneViewport}>
        {daily ? (
          <Image
            source={homeArt}
            resizeMode="cover"
            style={styles.sceneImage}
            accessibilityLabel={`Vela · ${[PHASE.IDLE, PHASE.GREETING].includes(phase) ? idleScene?.label || '待機' : '注意到玩家'}`}
          />
        ) : (
          <>
            <Image source={TAROT_ROOM} resizeMode="cover" style={styles.sceneImage} />
            <View pointerEvents="none" style={styles.stageShade} />
            <View pointerEvents="none" style={styles.velaPortraitWrap}>
              <Image source={art} resizeMode="contain" style={styles.velaPortrait} accessibilityLabel={`Vela · ${pose}`} />
            </View>
          </>
        )}
      </View>

      {phase !== PHASE.IDLE && (
        <View style={styles.speechBubble}>
          <Text style={styles.speakerTag}>VELA</Text>
          <Text style={styles.speech}>{speech}</Text>
        </View>
      )}

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

function BackCard({ selected, special, onPress, index, disabled }) {
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

function RevealCard({ card, revealed, canReveal, onPress, lockedHint = '先翻前一張' }) {
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

function MiniCard({ card }) {
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

function getGameReading(resultCard, card, index) {
  const fallback = mockCardReading(card, index);
  return {
    coreJudgment: resultCard?.coreJudgment || resultCard?.contextInterpretation?.split('。')?.[0] || fallback,
    briefReason: resultCard?.briefReason || resultCard?.contextInterpretation || fallback,
    recap: resultCard?.recap || resultCard?.coreJudgment || `${card?.name}：${fallback}`,
    practicalFocus: resultCard?.practicalFocus || '',
  };
}

function splitSpeech(text, sentencesPerBeat = 2) {
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
  const segments = [core, ...splitSpeech(reason, 1)];
  if (game.practicalFocus) segments.push(`你可以先這樣做：${game.practicalFocus}`);
  return [...new Set(segments.filter(Boolean))];
}

function shortSynthesis(overview, narrative) {
  const beats = [String(overview || '').trim(), ...splitSpeech(narrative, 2)].filter(Boolean);
  return beats.slice(0, 2).join('\n');
}

function ActiveReading({ card, index, interpretation }) {
  if (!card) return null;
  const game = getGameReading(interpretation?.cards?.[index], card, index);
  return (
    <View style={styles.activeReading}>
      <View style={styles.activeCardIdentity}>
        <Text style={styles.endEyebrow}>{card.positionLabel || `CARD ${index + 1}`}</Text>
        <Text style={styles.activeCardName}>{card.name} · {card.reversed ? '逆位' : '正位'}</Text>
      </View>
      <Text style={styles.reasonCopy}>{game.briefReason}</Text>
      {!!game.practicalFocus && (
        <View style={styles.actionCue}>
          <Text style={styles.actionCueLabel}>你可以先做</Text>
          <Text style={styles.actionCueText}>{game.practicalFocus}</Text>
        </View>
      )}
    </View>
  );
}

function ReadingRecap({ card, index, interpretation }) {
  if (!card) return null;
  const game = getGameReading(interpretation?.cards?.[index], card, index);
  return (
    <View style={styles.recapRow}>
      <Text style={styles.recapCard}>{card.name} · {card.reversed ? '逆位' : '正位'}</Text>
      <Text style={styles.recapText}>→ {game.recap}</Text>
    </View>
  );
}

export default function App() {
  const scrollRef = useRef(null);
  const [phase, setPhase] = useState(PHASE.IDLE);
  const [idleScene, setIdleScene] = useState(() => pickIdleScene());
  const [prepareIndex, setPrepareIndex] = useState(0);
  const [thinkingIndex, setThinkingIndex] = useState(0);
  const [question, setQuestion] = useState('');
  const [questionDraft, setQuestionDraft] = useState('');
  const [requestId, setRequestId] = useState('');
  const [selectedIndexes, setSelectedIndexes] = useState([]);
  const [drawData, setDrawData] = useState(null);
  const [drawCards, setDrawCards] = useState([]);
  const [drawLoading, setDrawLoading] = useState(false);
  const [interpretation, setInterpretation] = useState(null);
  const [interpretationLoading, setInterpretationLoading] = useState(false);
  const [businessCardIndex, setBusinessCardIndex] = useState(() => Math.random() < 0.05 ? Math.floor(Math.random() * 12) : null);
  const [speech, setSpeech] = useState('');
  const [revealCount, setRevealCount] = useState(0);
  const [analysisCount, setAnalysisCount] = useState(1);
  const [readingBeat, setReadingBeat] = useState(0);
  const [followupInput, setFollowupInput] = useState('');
  const [followupMessage, setFollowupMessage] = useState('');
  const [followupAnswered, setFollowupAnswered] = useState(false);
  const [followupAnswer, setFollowupAnswer] = useState('');
  const [followupPracticalFocus, setFollowupPracticalFocus] = useState('');
  const [followupLoading, setFollowupLoading] = useState(false);
  const [supplementCard, setSupplementCard] = useState(null);
  const [supplementRevealed, setSupplementRevealed] = useState(false);

  const slots = useMemo(() => Array.from({ length: 12 }, (_, index) => index), []);
  const reflectionQuestion = interpretation?.synthesis?.reflectionQuestions?.[0]
    || '你現在真正怕的是「選錯」，還是「失去」？';

  useEffect(() => {
    if (phase !== PHASE.CURTAIN) return undefined;
    const timer = setTimeout(() => {
      if (prepareIndex < PREPARE_LINES.length - 1) {
        setPrepareIndex((value) => value + 1);
      } else {
        setQuestionDraft('');
        setSpeech('請坐。今天想問什麼問題？');
        setPhase(PHASE.QUESTION);
      }
    }, 900);
    return () => clearTimeout(timer);
  }, [phase, prepareIndex]);

  useEffect(() => {
    if (phase !== PHASE.DRAW || selectedIndexes.length !== 3 || drawLoading) return undefined;
    let cancelled = false;
    setDrawLoading(true);
    setSpeech('好，就這三張。');

    (async () => {
      try {
        if (!LIVE_READING_ENABLED) throw new Error('mobile API URL not configured');
        const draw = await drawTarotReading({ question, selectedCardIndexes: selectedIndexes, requestId });
        if (cancelled) return;
        setDrawData(draw);
        setDrawCards(normalizeDrawCards(draw));
      } catch (error) {
        console.warn('Falling back to mock draw:', error?.message || error);
        if (cancelled) return;
        setDrawData(null);
        setDrawCards(createMockCards());
      } finally {
        if (!cancelled) {
          setRevealCount(0);
          setDrawLoading(false);
          setPhase(PHASE.REVEAL);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [phase, selectedIndexes, question, requestId]);

  useEffect(() => {
    if (phase !== PHASE.REVEAL || drawCards.length !== 3 || revealCount !== drawCards.length) return undefined;
    const timer = setTimeout(() => {
      setThinkingIndex(0);
      setInterpretation(null);
      setPhase(PHASE.THINKING);
    }, 850);
    return () => clearTimeout(timer);
  }, [phase, revealCount, drawCards.length]);

  useEffect(() => {
    if (phase !== PHASE.THINKING || interpretationLoading || interpretation) return undefined;
    let cancelled = false;
    setInterpretationLoading(true);

    (async () => {
      try {
        if (!LIVE_READING_ENABLED || !drawData?.readingId) throw new Error('live interpretation unavailable');
        const result = await interpretTarotReading({
          question,
          readingId: drawData.readingId,
          selectedCardIndexes: selectedIndexes,
          requestId,
        });
        if (!cancelled) setInterpretation(result);
      } catch (error) {
        console.warn('Falling back to mock interpretation:', error?.message || error);
        if (!cancelled) setInterpretation(createMockInterpretation(drawCards));
      } finally {
        if (!cancelled) setInterpretationLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [phase, interpretation, drawData, drawCards, question, selectedIndexes, requestId]);

  useEffect(() => {
    if (phase !== PHASE.THINKING) return undefined;
    if (thinkingIndex < THINKING_LINES.length - 1) {
      const timer = setTimeout(() => setThinkingIndex((value) => value + 1), 1050);
      return () => clearTimeout(timer);
    }
    if (!interpretation) return undefined;
    const timer = setTimeout(() => {
      setAnalysisCount(1);
      setReadingBeat(0);
      setSpeech('好，先看第一張。');
      setPhase(PHASE.FIRST_READING);
    }, 500);
    return () => clearTimeout(timer);
  }, [phase, thinkingIndex, interpretation]);





  useEffect(() => {
    if ([PHASE.QUESTION, PHASE.REVEAL, PHASE.THINKING, PHASE.FIRST_READING, PHASE.LOGIN_GATE, PHASE.FULL_READING, PHASE.SYNTHESIS, PHASE.FOLLOWUP, PHASE.SUPPLEMENT, PHASE.WRAP_UP, PHASE.GOODBYE].includes(phase)) {
      const timer = setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), 80);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [phase]);

  function greetVela() {
    Vibration.vibrate(10);
    setSpeech('……嗯？你來了。');
    setPhase(PHASE.GREETING);
  }

  function noticeVela() {
    Vibration.vibrate(10);
    setSpeech('……你想看塔羅？');
    setPhase(PHASE.NOTICE);
  }

  function startCurtain() {
    setPrepareIndex(0);
    setSpeech(PREPARE_LINES[0]);
    setPhase(PHASE.CURTAIN);
  }

  function submitQuestion(value = questionDraft) {
    const clean = value.trim();
    if (!clean) return;
    setQuestion(clean);
    setQuestionDraft('');
    setRequestId(makeRequestId());
    setSelectedIndexes([]);
    setDrawData(null);
    setDrawCards([]);
    setInterpretation(null);
    setSpeech('好。先別想太多，憑感覺挑三張。');
    setPhase(PHASE.DRAW);
  }

  function chooseCard(index) {
    if (drawLoading) return;
    if (index === businessCardIndex) {
      Vibration.vibrate(35);
      setSpeech('啊！抱歉，那是我的名片。你當作沒看到。');
      setBusinessCardIndex(null);
      return;
    }
    setSelectedIndexes((current) => {
      if (current.includes(index)) {
        setSpeech('反悔也可以。');
        return current.filter((value) => value !== index);
      }
      if (current.length >= 3) return current;
      Vibration.vibrate(12);
      const next = [...current, index];
      if (next.length === 3) setSpeech('好，就這三張。');
      return next;
    });
  }

  function revealCard(index) {
    if (index !== revealCount) return;
    Vibration.vibrate(25);
    const next = revealCount + 1;
    setRevealCount(next);
    if (next === 1) setSpeech('……喔。這張有點意思。');
    else if (next === 2) setSpeech('嗯，這兩張放在一起就不太單純了。');
    else setSpeech('好，我大概知道它們想說什麼了。');
  }

  async function openLogin() {
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

  function continueToFollowup() {
    setSpeech(reflectionQuestion);
    setPhase(PHASE.FOLLOWUP);
  }

  function openSupplement() {
    if (followupLoading || !followupAnswer) return;
    const [cardId, name, english] = TAROT_POOL[Math.floor(Math.random() * TAROT_POOL.length)];
    setSupplementCard({ id: `supplement-${Date.now()}`, cardId, name, english, reversed: Math.random() < 0.5 });
    setSupplementRevealed(false);
    setSpeech('我再補一張。先別急，你自己翻。');
    setPhase(PHASE.SUPPLEMENT);
  }

  function revealSupplement() {
    if (!supplementCard || supplementRevealed) return;
    Vibration.vibrate(28);
    setSupplementRevealed(true);
    setSpeech('……嗯，果然。這張把焦點縮小了。');
  }

  function finishSupplement() {
    setSpeech('大概就是這樣。你還想留一下，還是今天先到這裡？');
    setPhase(PHASE.WRAP_UP);
  }

  function stayWithVela() {
    setFollowupAnswered(false);
    setFollowupAnswer('');
    setFollowupMessage('');
    setFollowupInput('');
    setSpeech('好，那再聊一下。你還想問什麼？');
    setPhase(PHASE.FOLLOWUP);
  }

  function sayGoodbye() {
    setSpeech('好。那今天先到這裡。下次見。');
    setPhase(PHASE.GOODBYE);
  }

  async function answerFollowup(message) {
    const clean = message.trim();
    if (!clean || followupLoading || followupAnswered) return;

    setFollowupMessage(clean);
    setFollowupInput('');
    setFollowupAnswered(true);
    setFollowupAnswer('');
    setFollowupPracticalFocus('');
    setFollowupLoading(true);
    setSpeech('嗯……我再看一下。');

    try {
      if (!LIVE_READING_ENABLED || !drawData?.readingId || !interpretation) {
        throw new Error('live follow-up unavailable');
      }

      const analysis = interpretation?.analysisSynthesis || interpretation?.synthesis || {};
      const result = await followUpTarotReading({
        question,
        readingId: drawData.readingId,
        selectedCardIndexes: selectedIndexes,
        requestId,
        message: clean,
        history: [],
        initialReading: {
          overview: analysis.overview || '',
          narrative: analysis.narrative || '',
          cards: (interpretation?.cards || []).map((card) => ({
            cardId: card.cardId || '',
            contextInterpretation: card.contextInterpretation || '',
            practicalFocus: card.practicalFocus || '',
          })),
        },
      });

      setFollowupAnswer(result.answer || '我會把你這句話放回原本三張牌裡一起看。');
      setFollowupPracticalFocus(result.practicalFocus || '');
    } catch (error) {
      console.warn('Falling back to mock follow-up:', error?.message || error);
      setFollowupAnswer('我會把你這句話放回原本三張牌裡看。現在比較重要的不是逼自己立刻做決定，而是分清楚：你是在怕選錯，還是真的有一個不能忽略的卡點。');
      setFollowupPracticalFocus('');
    } finally {
      setFollowupLoading(false);
      setSpeech('等一下，我想再確認一件事。');
    }
  }

  function resetReading() {
    setPhase(PHASE.IDLE);
    setIdleScene(pickIdleScene());
    setPrepareIndex(0);
    setThinkingIndex(0);
    setQuestion('');
    setQuestionDraft('');
    setRequestId('');
    setSelectedIndexes([]);
    setDrawData(null);
    setDrawCards([]);
    setDrawLoading(false);
    setInterpretation(null);
    setInterpretationLoading(false);
    setRevealCount(0);
    setAnalysisCount(1);
    setReadingBeat(0);
    setFollowupInput('');
    setFollowupMessage('');
    setFollowupAnswered(false);
    setFollowupAnswer('');
    setFollowupPracticalFocus('');
    setFollowupLoading(false);
    setSupplementCard(null);
    setSupplementRevealed(false);
    setBusinessCardIndex(Math.random() < 0.05 ? Math.floor(Math.random() * 12) : null);
    setSpeech('');
    setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), 50);
  }

  const activeReadingIndex = phase === PHASE.FIRST_READING
    ? 0
    : phase === PHASE.FULL_READING
      ? Math.max(0, analysisCount - 1)
      : null;
  const activeResultCard = activeReadingIndex === null ? null : interpretation?.cards?.[activeReadingIndex];
  const activeDrawCard = activeReadingIndex === null ? null : drawCards[activeReadingIndex];
  const activeGameReading = activeReadingIndex === null
    ? null
    : getGameReading(activeResultCard, activeDrawCard, activeReadingIndex);

  const synthesisOverview = interpretation?.analysisSynthesis?.overview || '三張牌放在一起';
  const synthesisNarrative = interpretation?.analysisSynthesis?.narrative
    || '第一張描述你現在的位置，第二張指出真正的阻力，第三張則把下一步縮小到一個比較能處理的方向。';

  const readingSegments = activeReadingIndex === null
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

  const velaPose = phase === PHASE.THINKING
    ? 'thinking'
    : phase === PHASE.NOTICE
      ? 'asking'
      : phase === PHASE.FOLLOWUP
        ? (followupLoading ? 'thinking' : followupAnswered ? 'reading' : 'asking')
        : phase === PHASE.SUPPLEMENT
          ? (supplementRevealed ? 'clarifier' : 'reading')
          : phase === PHASE.WRAP_UP
            ? 'asking'
            : phase === PHASE.GOODBYE
              ? 'bye'
              : [PHASE.FIRST_READING, PHASE.LOGIN_GATE, PHASE.FULL_READING, PHASE.SYNTHESIS].includes(phase)
                ? 'reading'
                : 'ready';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <ScrollView ref={scrollRef} contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
        <VelaStage phase={phase} speech={stageSpeech} idleScene={idleScene} pose={velaPose} />

        {phase === PHASE.IDLE && (
          <View style={styles.actionArea}>
            <Pressable style={styles.primaryButton} onPress={greetVela}>
              <Text style={styles.primaryButtonText}>嗨 Vela</Text>
            </Pressable>
          </View>
        )}

        {phase === PHASE.GREETING && (
          <View style={styles.actionArea}>
            <Pressable style={styles.primaryButton} onPress={noticeVela}>
              <Text style={styles.primaryButtonText}>我要看塔羅</Text>
            </Pressable>
          </View>
        )}

        {phase === PHASE.NOTICE && (
          <View style={styles.actionArea}>
            <Pressable style={styles.primaryButton} onPress={startCurtain}>
              <Text style={styles.primaryButtonText}>對，幫我看</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={resetReading}>
              <Text style={styles.secondaryButtonText}>沒事</Text>
            </Pressable>
          </View>
        )}

        {phase === PHASE.QUESTION && (
          <View style={styles.tableSection}>
            <View style={styles.choiceList}>
              {QUESTION_PROMPTS.map((prompt) => (
                <Pressable key={prompt} style={styles.choiceButton} onPress={() => submitQuestion(prompt)}>
                  <Text style={styles.choiceButtonText}>{prompt}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.inputRow}>
              <TextInput
                value={questionDraft}
                onChangeText={setQuestionDraft}
                placeholder="或直接告訴 Vela……"
                placeholderTextColor="#725E7B"
                style={styles.textInput}
                returnKeyType="send"
                onSubmitEditing={() => submitQuestion()}
              />
              <Pressable style={styles.sendButton} onPress={() => submitQuestion()}>
                <Text style={styles.sendButtonText}>送出</Text>
              </Pressable>
            </View>
          </View>
        )}

        {phase === PHASE.DRAW && (
          <View style={styles.tableSection}>
            <View style={styles.cardGrid}>
              {slots.map((index) => (
                <BackCard
                  key={index}
                  index={index}
                  special={index === businessCardIndex}
                  selected={selectedIndexes.includes(index)}
                  disabled={drawLoading}
                  onPress={() => chooseCard(index)}
                />
              ))}
            </View>
          </View>
        )}

        {phase === PHASE.REVEAL && (
          <View style={styles.tableSection}>
            <View style={styles.revealRow}>
              {drawCards.map((card, index) => (
                <RevealCard
                  key={card.id}
                  card={card}
                  revealed={index < revealCount}
                  canReveal={index === revealCount}
                  onPress={() => revealCard(index)}
                />
              ))}
            </View>
          </View>
        )}

        {phase === PHASE.THINKING && (
          <View style={styles.thinkingSection}>
            <View style={styles.miniCardRow}>
              {drawCards.map((card) => <MiniCard key={card.id} card={card} />)}
            </View>
            <View style={styles.thinkingDots}>
              <View style={styles.thinkingDot} />
              <View style={styles.thinkingDot} />
              <View style={styles.thinkingDot} />
            </View>
          </View>
        )}

        {phase === PHASE.FIRST_READING && (
          <View style={styles.tableSection}>
            <ReadingCardStrip cards={drawCards} activeIndex={0} />
            <Pressable style={styles.primaryButton} onPress={continueAfterFirstReading}>
              <Text style={styles.primaryButtonText}>{readingBeat < Math.max(0, readingSegments.length - 1) ? '繼續' : '聽完第一張'}</Text>
            </Pressable>
          </View>
        )}

        {phase === PHASE.LOGIN_GATE && (
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

        {phase === PHASE.FULL_READING && (
          <View style={styles.tableSection}>
            <ReadingCardStrip cards={drawCards} activeIndex={analysisCount - 1} />
            <Pressable style={styles.primaryButton} onPress={advanceFullReading}>
              <Text style={styles.primaryButtonText}>{readingBeat < Math.max(0, readingSegments.length - 1) ? '繼續' : analysisCount < 3 ? '聽下一張' : '把三張串起來'}</Text>
            </Pressable>
          </View>
        )}

        {phase === PHASE.SYNTHESIS && (
          <View style={styles.tableSection}>
            <ReadingCardStrip cards={drawCards} activeIndex={-1} />
            <Pressable style={styles.primaryButton} onPress={continueToFollowup}>
              <Text style={styles.primaryButtonText}>繼續</Text>
            </Pressable>
          </View>
        )}

        {phase === PHASE.FOLLOWUP && (
          <View style={styles.tableSection}>
            {!followupAnswered && (
              <>
                <View style={styles.choiceList}>
                  {FOLLOWUP_CHOICES.map((choice) => (
                    <Pressable key={choice} style={styles.choiceButton} onPress={() => answerFollowup(choice)}>
                      <Text style={styles.choiceButtonText}>{choice}</Text>
                    </Pressable>
                  ))}
                </View>
                <View style={styles.inputRow}>
                  <TextInput
                    value={followupInput}
                    onChangeText={setFollowupInput}
                    placeholder="或自己問 Vela……"
                    placeholderTextColor="#725E7B"
                    style={styles.textInput}
                    returnKeyType="send"
                    onSubmitEditing={() => answerFollowup(followupInput)}
                  />
                  <Pressable style={styles.sendButton} onPress={() => answerFollowup(followupInput)}>
                    <Text style={styles.sendButtonText}>送出</Text>
                  </Pressable>
                </View>
              </>
            )}
            {followupAnswered && (
              <View style={styles.followupResult}>
                {!followupLoading && !!followupAnswer && (
                  <>
                    <Pressable style={styles.primaryButton} onPress={openSupplement}>
                      <Text style={styles.primaryButtonText}>再補一張確認</Text>
                    </Pressable>
                    <Pressable style={styles.secondaryButton} onPress={resetReading}>
                      <Text style={styles.secondaryButtonText}>先不用，今天到這裡</Text>
                    </Pressable>
                  </>
                )}
              </View>
            )}
          </View>
        )}

        {phase === PHASE.SUPPLEMENT && supplementCard && (
          <View style={styles.tableSection}>
            <View style={styles.supplementWrap}>
              <RevealCard
                card={supplementCard}
                revealed={supplementRevealed}
                canReveal={!supplementRevealed}
                onPress={revealSupplement}
                lockedHint=""
              />
            </View>
            {supplementRevealed && (
              <Pressable style={styles.primaryButton} onPress={finishSupplement}>
                <Text style={styles.primaryButtonText}>聽 Vela 說完</Text>
              </Pressable>
            )}
          </View>
        )}

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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#100918' },
  screen: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 36, backgroundColor: '#100918' },
  stage: { height: 418, borderRadius: 28, borderWidth: 1, borderColor: '#3B2550', backgroundColor: '#1A1025', alignItems: 'center', justifyContent: 'flex-start', overflow: 'hidden' },
  stageTarot: { backgroundColor: '#160D20', borderColor: '#5B386D' },
  sceneViewport: { position: 'absolute', top: 14, left: 14, right: 14, height: 286, borderRadius: 18, overflow: 'hidden', backgroundColor: '#160D20' },
  sceneImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  stageShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10, 5, 16, 0.14)', zIndex: 0 },
  velaPortraitWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'flex-end', zIndex: 2, overflow: 'hidden' },
  velaPortrait: { width: '94%', height: '105%', transform: [{ translateY: 10 }, { scale: 1.06 }] },
  speechBubble: { position: 'absolute', left: 16, right: 16, bottom: 14, minHeight: 88, maxHeight: 104, borderRadius: 17, backgroundColor: '#F0E4F4', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, zIndex: 5 },
  speakerTag: { position: 'absolute', top: -10, left: 14, borderRadius: 8, backgroundColor: '#5C356B', color: '#FFF5FF', paddingHorizontal: 9, paddingVertical: 4, fontSize: 9, fontWeight: '800', letterSpacing: 1.2, overflow: 'hidden' },
  speech: { color: '#25182C', fontSize: 14.5, lineHeight: 21, textAlign: 'left', fontWeight: '600' },
  curtainLayer: { position: 'absolute', top: 14, left: 14, right: 14, height: 286, borderRadius: 18, overflow: 'hidden', flexDirection: 'row', alignItems: 'stretch', justifyContent: 'center', zIndex: 20 },
  curtainPanel: { position: 'absolute', top: 0, bottom: 0, width: '52%', backgroundColor: '#4B205E' },
  curtainLeft: { left: 0, borderRightWidth: 1, borderRightColor: '#8C5DA0' },
  curtainRight: { right: 0, borderLeftWidth: 1, borderLeftColor: '#8C5DA0' },
  curtainCopy: { position: 'absolute', top: '57%', left: 28, right: 28, color: '#F3E8F6', fontSize: 15, lineHeight: 22, textAlign: 'center', zIndex: 25 },
  actionArea: { marginTop: 20 },
  bodyCopy: { color: '#B8A8BF', fontSize: 14, lineHeight: 22 },
  practicalFocus: { marginTop: 12, color: '#D8C2DF', fontSize: 13, lineHeight: 20, fontWeight: '600' },
  primaryButton: { marginTop: 14, minHeight: 54, borderRadius: 16, backgroundColor: '#7D4A91', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  primaryButtonText: { color: '#FFF8FF', fontSize: 16, fontWeight: '800' },
  secondaryButton: { marginTop: 10, minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: '#70517D', alignItems: 'center', justifyContent: 'center' },
  secondaryButtonText: { color: '#D9C6E0', fontSize: 15, fontWeight: '700' },
  tableSection: { marginTop: 20 },
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', rowGap: 10 },
  card: { width: '18%', marginRight: '-1.35%', aspectRatio: 0.62, borderRadius: 8, borderWidth: 1, borderColor: '#6B4B77', backgroundColor: '#24142F', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  cardSelected: { borderWidth: 2, borderColor: '#E4C6EE', transform: [{ translateY: -5 }], backgroundColor: '#3A2046' },
  businessCard: { borderColor: '#D6B56D' },
  businessCardHint: { ...StyleSheet.absoluteFillObject, borderWidth: 1, borderColor: 'rgba(217,185,110,0.6)', backgroundColor: 'rgba(217,185,110,0.06)' },
  cardBackImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  cardPressed: { opacity: 0.75, transform: [{ scale: 0.97 }] },
  revealRow: { flexDirection: 'row', gap: 10 },
  revealCard: { flex: 1, aspectRatio: 0.62, borderRadius: 14, borderWidth: 1, borderColor: '#62456F', backgroundColor: '#24142F', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  revealCardOpen: { backgroundColor: '#17101F', borderColor: '#F8ECFB' },
  revealCardArt: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  revealCardBack: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  revealMeta: { position: 'absolute', left: 5, right: 5, bottom: 5, borderRadius: 8, paddingVertical: 5, paddingHorizontal: 4, backgroundColor: 'rgba(16,9,24,0.82)', alignItems: 'center' },
  reversedCardArt: { transform: [{ rotate: '180deg' }] },
  tapHint: { marginTop: 12, color: '#9B84A5', fontSize: 11, textAlign: 'center' },
  revealName: { color: '#291C30', fontSize: 19, fontWeight: '800', textAlign: 'center' },
  revealEnglish: { marginTop: 8, color: '#6D5A74', fontSize: 11, textAlign: 'center' },
  orientation: { marginTop: 20, color: '#7D4A91', fontSize: 13, fontWeight: '800' },
  readingStrip: { width: '100%', height: 184, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  readingStripCard: { width: '31.5%', height: 184, borderRadius: 14, borderWidth: 1, borderColor: '#5E416A', backgroundColor: '#24142F', alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden' },
  readingStripCardActive: { borderWidth: 2, borderColor: '#E1BF68', backgroundColor: '#35203F', transform: [{ translateY: -4 }], shadowColor: '#E1BF68', shadowOpacity: 0.9, shadowRadius: 12, shadowOffset: { width: 0, height: 0 } },
  readingStripArt: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  readingStripMeta: { width: '100%', paddingVertical: 7, paddingHorizontal: 4, backgroundColor: 'rgba(16,9,24,0.84)', alignItems: 'center' },
  readingStripName: { color: '#BBA9C1', fontSize: 14, fontWeight: '800', textAlign: 'center' },
  readingStripNameActive: { color: '#FFF5FF' },
  readingStripOrientation: { marginTop: 7, color: '#AE8CBA', fontSize: 11 },
  thinkingSection: { marginTop: 20, alignItems: 'center' },
  miniCardRow: { width: '100%', height: 154, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  miniCard: { width: '31.5%', height: 154, borderRadius: 12, borderWidth: 1, borderColor: '#5E416A', backgroundColor: '#24142F', alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden' },
  miniCardArt: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  miniCardName: { color: '#EBDFF0', fontSize: 14, fontWeight: '800', textAlign: 'center' },
  miniCardOrientation: { marginTop: 7, color: '#AE8CBA', fontSize: 11 },
  thinkingDots: { marginTop: 22, flexDirection: 'row', gap: 8 },
  thinkingDot: { width: 7, height: 7, borderRadius: 99, backgroundColor: '#B58AC6' },
  activeReading: { marginTop: 14, paddingVertical: 6 },
  activeCardIdentity: { marginBottom: 14 },
  activeCardName: { color: '#F3E8F6', fontSize: 19, fontWeight: '800' },
  reasonCopy: { color: '#CDBED2', fontSize: 15, lineHeight: 24 },
  actionCue: { marginTop: 16, borderLeftWidth: 2, borderLeftColor: '#B58AC6', paddingLeft: 12 },
  actionCueLabel: { color: '#9E7EAA', fontSize: 10, fontWeight: '800', letterSpacing: 1.1, marginBottom: 5 },
  actionCueText: { color: '#EFE3F2', fontSize: 14, lineHeight: 21, fontWeight: '700' },
  recapStack: { gap: 8 },
  recapRow: { borderRadius: 14, borderWidth: 1, borderColor: '#3E2B48', backgroundColor: '#17101E', paddingHorizontal: 13, paddingVertical: 11 },
  recapCard: { color: '#AA8FB4', fontSize: 11, fontWeight: '800', marginBottom: 4 },
  recapText: { color: '#E5D8E9', fontSize: 13, lineHeight: 19 },
  synthesisScene: { marginTop: 18, paddingHorizontal: 4 },
  synthesisNarrative: { color: '#D8CADC', fontSize: 15, lineHeight: 24 },
  synthesisStep: { marginTop: 11, flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  synthesisStepDot: { color: '#B58AC6', fontSize: 17, lineHeight: 20 },
  synthesisStepText: { flex: 1, color: '#F0E5F3', fontSize: 14, lineHeight: 21, fontWeight: '600' },
  analysisCard: { marginTop: 14, borderRadius: 20, borderWidth: 1, borderColor: '#3C2A45', backgroundColor: '#18101F', padding: 18 },
  gateCard: { marginTop: 14, borderRadius: 20, borderWidth: 1, borderColor: '#6A4C77', backgroundColor: '#201328', padding: 18 },
  synthesisCard: { marginTop: 14, borderRadius: 20, borderWidth: 1, borderColor: '#4D3559', backgroundColor: '#18101F', padding: 18 },
  endEyebrow: { color: '#B58AC6', fontSize: 10, fontWeight: '800', letterSpacing: 1.4, marginBottom: 6 },
  analysisTitle: { marginBottom: 10, color: '#F3E8F6', fontSize: 18, fontWeight: '800' },
  choiceList: { gap: 10 },
  choiceButton: { minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: '#5F436B', backgroundColor: '#1B1122', justifyContent: 'center', paddingHorizontal: 15 },
  choiceButtonText: { color: '#E8DCEB', fontSize: 14, lineHeight: 20 },
  inputRow: { marginTop: 14, flexDirection: 'row', gap: 10 },
  textInput: { flex: 1, minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: '#5F436B', backgroundColor: '#18101F', color: '#F2E8F4', paddingHorizontal: 14, fontSize: 14 },
  sendButton: { minWidth: 70, borderRadius: 14, backgroundColor: '#7D4A91', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  sendButtonText: { color: '#FFF8FF', fontSize: 14, fontWeight: '800' },
  followupResult: { marginTop: 14 },
  userBubble: { alignSelf: 'flex-end', maxWidth: '86%', borderRadius: 16, backgroundColor: '#6D427D', color: '#FFF8FF', paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, lineHeight: 20 },
  velaReply: { marginTop: 14, color: '#D7C6DC', fontSize: 14, lineHeight: 22 },
  supplementWrap: { marginTop: 6, width: '45%', alignSelf: 'center' },
});
