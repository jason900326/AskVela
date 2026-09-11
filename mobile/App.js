import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
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
  drawTarotReading,
  interpretTarotReading,
  makeRequestId,
  normalizeDrawCards,
} from './vela-api';

const PHASE = {
  IDLE: 'idle',
  NOTICE: 'notice',
  CURTAIN: 'curtain',
  QUESTION: 'question',
  DRAW: 'draw',
  REVEAL: 'reveal',
  THINKING: 'thinking',
  FIRST_READING: 'first-reading',
  LOGIN_GATE: 'login-gate',
  FULL_READING: 'full-reading',
  FOLLOWUP: 'followup',
  SUPPLEMENT: 'supplement',
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
  ['愚者', 'The Fool'],
  ['魔術師', 'The Magician'],
  ['女祭司', 'The High Priestess'],
  ['皇后', 'The Empress'],
  ['皇帝', 'The Emperor'],
  ['教皇', 'The Hierophant'],
  ['戀人', 'The Lovers'],
  ['戰車', 'The Chariot'],
  ['力量', 'Strength'],
  ['隱者', 'The Hermit'],
  ['命運之輪', 'Wheel of Fortune'],
  ['正義', 'Justice'],
  ['倒吊人', 'The Hanged Man'],
  ['死神', 'Death'],
  ['節制', 'Temperance'],
  ['惡魔', 'The Devil'],
  ['高塔', 'The Tower'],
  ['星星', 'The Star'],
  ['月亮', 'The Moon'],
  ['太陽', 'The Sun'],
  ['審判', 'Judgement'],
  ['世界', 'The World'],
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
  return shuffled.map(([name, english], index) => ({
    id: `mock-${Date.now()}-${index}`,
    cardId: `mock-${index}`,
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
      contextInterpretation: mockCardReading(card, index),
      practicalFocus: index === 2 ? '先處理你能控制的那一步。' : '',
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

function VelaStage({ phase, speech, idleScene }) {
  const float = useRef(new Animated.Value(0)).current;
  const proximity = useRef(new Animated.Value(0)).current;
  const curtain = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: -5, duration: 1800, useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [float]);

  useEffect(() => {
    Animated.spring(proximity, {
      toValue: phase === PHASE.NOTICE ? 1 : 0,
      friction: 7,
      tension: 70,
      useNativeDriver: true,
    }).start();
  }, [phase, proximity]);

  useEffect(() => {
    if (phase !== PHASE.CURTAIN) {
      curtain.setValue(0);
      return;
    }
    Animated.timing(curtain, { toValue: 1, duration: 620, useNativeDriver: true }).start();
  }, [phase, curtain]);

  const daily = phase === PHASE.IDLE || phase === PHASE.NOTICE;
  const closeScale = proximity.interpolate({ inputRange: [0, 1], outputRange: [1, 1.55] });
  const closeY = proximity.interpolate({ inputRange: [0, 1], outputRange: [0, 42] });
  const leftX = curtain.interpolate({ inputRange: [0, 1], outputRange: [-190, 0] });
  const rightX = curtain.interpolate({ inputRange: [0, 1], outputRange: [190, 0] });

  return (
    <View style={[styles.stage, !daily && styles.stageTarot]}>
      <Text style={styles.moon}>☾</Text>
      <Animated.View
        style={[
          styles.velaPlaceholder,
          !daily && styles.velaPlaceholderReady,
          { transform: [{ translateY: Animated.add(float, closeY) }, { scale: closeScale }] },
        ]}
      >
        <Text style={styles.velaInitial}>V</Text>
        <Text style={styles.velaState}>{daily ? idleScene.label : 'TAROT VELA'}</Text>
      </Animated.View>
      <View style={styles.speechBubble}>
        <Text style={styles.speech}>{speech}</Text>
      </View>
      {phase === PHASE.CURTAIN && (
        <View pointerEvents="none" style={styles.curtainLayer}>
          <Animated.View style={[styles.curtainPanel, styles.curtainLeft, { transform: [{ translateX: leftX }] }]} />
          <Animated.View style={[styles.curtainPanel, styles.curtainRight, { transform: [{ translateX: rightX }] }]} />
          <Text style={styles.curtainMoon}>☾</Text>
          <Text style={styles.curtainCopy}>{speech}</Text>
        </View>
      )}
    </View>
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
      <Text style={styles.cardMoon}>{special ? '✦' : '☾'}</Text>
      <Text style={styles.cardIndex}>{index + 1}</Text>
    </Pressable>
  );
}

function RevealCard({ card, revealed, canReveal, onPress, lockedHint = '先翻前一張' }) {
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
        <>
          <Text style={styles.revealName}>{card.name}</Text>
          <Text style={styles.revealEnglish}>{card.english}</Text>
          <Text style={styles.orientation}>{card.reversed ? '逆位' : '正位'}</Text>
        </>
      ) : (
        <>
          <Text style={styles.revealMoon}>☾</Text>
          {(canReveal || lockedHint) && <Text style={styles.tapHint}>{canReveal ? '點一下翻牌' : lockedHint}</Text>}
        </>
      )}
    </Pressable>
  );
}

function MiniCard({ card }) {
  return (
    <View style={styles.miniCard}>
      <Text style={styles.miniCardName}>{card.name}</Text>
      <Text style={styles.miniCardOrientation}>{card.reversed ? '逆位' : '正位'}</Text>
    </View>
  );
}

function ReadingBlock({ card, index, interpretation }) {
  if (!card) return null;
  const resultCard = interpretation?.cards?.[index];
  return (
    <View style={styles.analysisCard}>
      <Text style={styles.endEyebrow}>{card.positionLabel || `CARD ${index + 1}`}</Text>
      <Text style={styles.analysisTitle}>{card.name} · {card.reversed ? '逆位' : '正位'}</Text>
      <Text style={styles.bodyCopy}>{resultCard?.contextInterpretation || mockCardReading(card, index)}</Text>
      {!!resultCard?.practicalFocus && <Text style={styles.practicalFocus}>{resultCard.practicalFocus}</Text>}
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
  const [speech, setSpeech] = useState('……嗯？你來了。');
  const [revealCount, setRevealCount] = useState(0);
  const [analysisCount, setAnalysisCount] = useState(1);
  const [followupInput, setFollowupInput] = useState('');
  const [followupMessage, setFollowupMessage] = useState('');
  const [followupAnswered, setFollowupAnswered] = useState(false);
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
  }, [phase, selectedIndexes, drawLoading, question, requestId]);

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
  }, [phase, interpretationLoading, interpretation, drawData, drawCards, question, selectedIndexes, requestId]);

  useEffect(() => {
    if (phase !== PHASE.THINKING) return undefined;
    if (thinkingIndex < THINKING_LINES.length - 1) {
      const timer = setTimeout(() => setThinkingIndex((value) => value + 1), 1050);
      return () => clearTimeout(timer);
    }
    if (!interpretation) return undefined;
    const timer = setTimeout(() => {
      setAnalysisCount(1);
      setSpeech('好，先看第一張。');
      setPhase(PHASE.FIRST_READING);
    }, 500);
    return () => clearTimeout(timer);
  }, [phase, thinkingIndex, interpretation]);

  useEffect(() => {
    if (phase !== PHASE.FIRST_READING) return undefined;
    const timer = setTimeout(() => {
      setSpeech('後面兩張才會把這件事講完整。要我繼續嗎？');
      setPhase(PHASE.LOGIN_GATE);
    }, 2300);
    return () => clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== PHASE.FULL_READING) return undefined;
    if (analysisCount < 3) {
      const timer = setTimeout(() => {
        const next = analysisCount + 1;
        setAnalysisCount(next);
        setSpeech(next === 2 ? '第二張是卡住你的地方。' : '最後一張，我覺得你要注意這裡。');
      }, 1650);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => {
      setSpeech('三張放在一起，我反而想先問你一件事。');
      setPhase(PHASE.FOLLOWUP);
    }, 1900);
    return () => clearTimeout(timer);
  }, [phase, analysisCount]);

  useEffect(() => {
    if (phase !== PHASE.FOLLOWUP || !followupAnswered) return undefined;
    const timer = setTimeout(() => {
      const [name, english] = TAROT_POOL[Math.floor(Math.random() * TAROT_POOL.length)];
      setSupplementCard({ id: `supplement-${Date.now()}`, name, english, reversed: Math.random() < 0.5 });
      setSupplementRevealed(false);
      setSpeech('等一下，我想確認一件事。');
      setPhase(PHASE.SUPPLEMENT);
    }, 1250);
    return () => clearTimeout(timer);
  }, [phase, followupAnswered]);

  useEffect(() => {
    if (phase !== PHASE.SUPPLEMENT || !supplementCard || supplementRevealed) return undefined;
    const timer = setTimeout(() => {
      Vibration.vibrate(28);
      setSupplementRevealed(true);
      setSpeech('……嗯，果然。');
    }, 1150);
    return () => clearTimeout(timer);
  }, [phase, supplementCard, supplementRevealed]);

  useEffect(() => {
    if ([PHASE.QUESTION, PHASE.REVEAL, PHASE.THINKING, PHASE.FIRST_READING, PHASE.LOGIN_GATE, PHASE.FULL_READING, PHASE.FOLLOWUP, PHASE.SUPPLEMENT].includes(phase)) {
      const timer = setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), 80);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [phase]);

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

  function unlockFullReading() {
    setAnalysisCount(1);
    setSpeech('好。那我繼續講。');
    setPhase(PHASE.FULL_READING);
  }

  function answerFollowup(message) {
    const clean = message.trim();
    if (!clean) return;
    setFollowupMessage(clean);
    setFollowupInput('');
    setFollowupAnswered(true);
    setSpeech('嗯……等一下。');
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
    setFollowupInput('');
    setFollowupMessage('');
    setFollowupAnswered(false);
    setSupplementCard(null);
    setSupplementRevealed(false);
    setBusinessCardIndex(Math.random() < 0.05 ? Math.floor(Math.random() * 12) : null);
    setSpeech('……嗯？你來了。');
    setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), 50);
  }

  const stageSpeech = phase === PHASE.CURTAIN
    ? PREPARE_LINES[prepareIndex]
    : phase === PHASE.THINKING
      ? THINKING_LINES[thinkingIndex]
      : speech;

  const synthesisOverview = interpretation?.analysisSynthesis?.overview || '三張牌放在一起';
  const synthesisNarrative = interpretation?.analysisSynthesis?.narrative
    || '第一張描述你現在的位置，第二張指出真正的阻力，第三張則把下一步縮小到一個比較能處理的方向。';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <ScrollView ref={scrollRef} contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
        <VelaStage phase={phase} speech={stageSpeech} idleScene={idleScene} />

        {phase === PHASE.IDLE && (
          <View style={styles.actionArea}>
            <Pressable style={styles.primaryButton} onPress={noticeVela}>
              <Text style={styles.primaryButtonText}>Vela，我想看塔羅</Text>
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
            <ReadingBlock card={drawCards[0]} index={0} interpretation={interpretation} />
          </View>
        )}

        {phase === PHASE.LOGIN_GATE && (
          <View style={styles.tableSection}>
            <ReadingBlock card={drawCards[0]} index={0} interpretation={interpretation} />
            <View style={styles.gateCard}>
              <Text style={styles.analysisTitle}>後面兩張會把關係串起來。</Text>
              <Pressable style={styles.primaryButton} onPress={unlockFullReading}>
                <Text style={styles.primaryButtonText}>登入並繼續</Text>
              </Pressable>
            </View>
          </View>
        )}

        {phase === PHASE.FULL_READING && (
          <View style={styles.tableSection}>
            {drawCards.slice(0, analysisCount).map((card, index) => (
              <ReadingBlock key={card.id} card={card} index={index} interpretation={interpretation} />
            ))}
            {analysisCount === 3 && (
              <View style={styles.synthesisCard}>
                <Text style={styles.analysisTitle}>{synthesisOverview}</Text>
                <Text style={styles.bodyCopy}>{synthesisNarrative}</Text>
              </View>
            )}
          </View>
        )}

        {phase === PHASE.FOLLOWUP && (
          <View style={styles.tableSection}>
            <View style={styles.synthesisCard}>
              <Text style={styles.analysisTitle}>{reflectionQuestion}</Text>
            </View>
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
                <Text style={styles.userBubble}>{followupMessage}</Text>
                <Text style={styles.velaReply}>等一下，我想確認一件事。</Text>
              </View>
            )}
          </View>
        )}

        {phase === PHASE.SUPPLEMENT && supplementCard && (
          <View style={styles.tableSection}>
            <View style={styles.supplementWrap}>
              <RevealCard card={supplementCard} revealed={supplementRevealed} canReveal={false} onPress={() => {}} lockedHint="" />
            </View>
            {supplementRevealed && (
              <View style={styles.synthesisCard}>
                <Text style={styles.analysisTitle}>{supplementCard.name} · {supplementCard.reversed ? '逆位' : '正位'}</Text>
                <Text style={styles.bodyCopy}>這張沒有推翻前面三張，它只是把焦點縮小：你接下來先處理自己能控制的部分，比一直猜結果更有用。</Text>
                <Pressable style={styles.primaryButton} onPress={resetReading}>
                  <Text style={styles.primaryButtonText}>今天先到這裡</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#100918' },
  screen: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 36, backgroundColor: '#100918' },
  stage: { minHeight: 330, borderRadius: 28, borderWidth: 1, borderColor: '#3B2550', backgroundColor: '#1A1025', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: 20 },
  stageTarot: { backgroundColor: '#160D20', borderColor: '#5B386D' },
  moon: { position: 'absolute', top: 17, right: 22, color: '#D9B96E', fontSize: 31 },
  velaPlaceholder: { width: 150, height: 190, borderTopLeftRadius: 74, borderTopRightRadius: 74, borderBottomLeftRadius: 34, borderBottomRightRadius: 34, backgroundColor: '#2B1D36', borderWidth: 1, borderColor: '#594064', alignItems: 'center', justifyContent: 'center' },
  velaPlaceholderReady: { backgroundColor: '#392046', borderColor: '#9E77B2' },
  velaInitial: { color: '#F5E7FA', fontSize: 68, fontWeight: '300', fontFamily: 'serif' },
  velaState: { marginTop: 12, color: '#A993B5', fontSize: 9, letterSpacing: 1.2 },
  speechBubble: { marginTop: 22, width: '100%', borderRadius: 18, backgroundColor: '#F0E4F4', paddingHorizontal: 16, paddingVertical: 14 },
  speech: { color: '#25182C', fontSize: 16, lineHeight: 23, textAlign: 'center', fontWeight: '600' },
  curtainLayer: { ...StyleSheet.absoluteFillObject, flexDirection: 'row', alignItems: 'stretch', justifyContent: 'center', zIndex: 20 },
  curtainPanel: { position: 'absolute', top: 0, bottom: 0, width: '52%', backgroundColor: '#4B205E' },
  curtainLeft: { left: 0, borderRightWidth: 1, borderRightColor: '#8C5DA0' },
  curtainRight: { right: 0, borderLeftWidth: 1, borderLeftColor: '#8C5DA0' },
  curtainMoon: { position: 'absolute', top: '35%', color: '#D9B96E', fontSize: 54, zIndex: 25 },
  curtainCopy: { position: 'absolute', top: '57%', left: 28, right: 28, color: '#F3E8F6', fontSize: 15, lineHeight: 22, textAlign: 'center', zIndex: 25 },
  actionArea: { marginTop: 20 },
  bodyCopy: { color: '#B8A8BF', fontSize: 14, lineHeight: 22 },
  practicalFocus: { marginTop: 12, color: '#D8C2DF', fontSize: 13, lineHeight: 20, fontWeight: '600' },
  primaryButton: { marginTop: 14, minHeight: 54, borderRadius: 16, backgroundColor: '#7D4A91', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  primaryButtonText: { color: '#FFF8FF', fontSize: 16, fontWeight: '800' },
  secondaryButton: { marginTop: 10, minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: '#70517D', alignItems: 'center', justifyContent: 'center' },
  secondaryButtonText: { color: '#D9C6E0', fontSize: 15, fontWeight: '700' },
  tableSection: { marginTop: 20 },
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  card: { width: '15.2%', aspectRatio: 0.62, borderRadius: 8, borderWidth: 1, borderColor: '#6B4B77', backgroundColor: '#24142F', alignItems: 'center', justifyContent: 'center' },
  cardSelected: { borderWidth: 2, borderColor: '#E4C6EE', transform: [{ translateY: -5 }], backgroundColor: '#3A2046' },
  businessCard: { borderStyle: 'dashed', borderColor: '#D6B56D', backgroundColor: '#30233A' },
  cardPressed: { opacity: 0.75, transform: [{ scale: 0.97 }] },
  cardMoon: { color: '#D4B46D', fontSize: 18 },
  cardIndex: { position: 'absolute', bottom: 5, color: '#795E85', fontSize: 8 },
  revealRow: { flexDirection: 'row', gap: 10 },
  revealCard: { flex: 1, minHeight: 210, borderRadius: 14, borderWidth: 1, borderColor: '#62456F', backgroundColor: '#24142F', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  revealCardOpen: { backgroundColor: '#EBDFF0', borderColor: '#F8ECFB' },
  revealMoon: { color: '#D4B46D', fontSize: 34 },
  tapHint: { marginTop: 12, color: '#9B84A5', fontSize: 11, textAlign: 'center' },
  revealName: { color: '#291C30', fontSize: 19, fontWeight: '800', textAlign: 'center' },
  revealEnglish: { marginTop: 8, color: '#6D5A74', fontSize: 11, textAlign: 'center' },
  orientation: { marginTop: 20, color: '#7D4A91', fontSize: 13, fontWeight: '800' },
  thinkingSection: { marginTop: 20, alignItems: 'center' },
  miniCardRow: { width: '100%', flexDirection: 'row', gap: 10 },
  miniCard: { flex: 1, minHeight: 96, borderRadius: 13, borderWidth: 1, borderColor: '#5E416A', backgroundColor: '#24142F', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  miniCardName: { color: '#EBDFF0', fontSize: 14, fontWeight: '800', textAlign: 'center' },
  miniCardOrientation: { marginTop: 7, color: '#AE8CBA', fontSize: 11 },
  thinkingDots: { marginTop: 22, flexDirection: 'row', gap: 8 },
  thinkingDot: { width: 7, height: 7, borderRadius: 99, backgroundColor: '#B58AC6' },
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
