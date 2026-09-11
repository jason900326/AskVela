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
  { key: 'phone', label: '滑手機', detail: '窩在沙發上，一邊滑手機一邊吃洋芋片。' },
  { key: 'tea', label: '發呆', detail: '抱著馬克杯發呆，完全沒有要工作的意思。' },
  { key: 'book', label: '亂翻書', detail: '拿著一本書翻了半天，但看起來沒有真的在看。' },
  { key: 'cat', label: '跟貓混在一起', detail: '和貓一起佔滿沙發，誰都沒有要讓位。' },
  { key: 'nap', label: '快睡著了', detail: '整個人縮在沙發角落，差一點就睡著。' },
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

function shuffle(input) {
  const array = [...input];
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function pickIdleScene() {
  return IDLE_SCENES[Math.floor(Math.random() * IDLE_SCENES.length)];
}

function createReading() {
  return shuffle(TAROT_POOL)
    .slice(0, 12)
    .map(([name, english], index) => ({
      id: `card-${index}`,
      name,
      english,
      reversed: Math.random() < 0.5,
    }));
}

function cardReading(card, index) {
  const orientation = card?.reversed ? '逆位' : '正位';
  const lines = [
    `${card?.name}出現在第一個位置，比較像是在說：你現在已經感覺到事情哪裡不對，只是還沒有完全承認。${orientation}讓這個訊號更明顯。`,
    `第二張${card?.name}比較像中間的卡點。它不是單獨在講好或壞，而是在提醒你：現在的反應很可能被前一張牌推著走。`,
    `最後的${card?.name}比較接近你接下來可以採取的方向。這張牌不是命令，比較像是提醒你哪一種選擇會讓事情變得比較清楚。`,
  ];
  return lines[index] ?? `${card?.name}在這組牌裡有自己的位置。`;
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
    Animated.timing(curtain, {
      toValue: 1,
      duration: 620,
      useNativeDriver: true,
    }).start();
  }, [phase, curtain]);

  const daily = phase === PHASE.IDLE || phase === PHASE.NOTICE;
  const closeScale = proximity.interpolate({ inputRange: [0, 1], outputRange: [1, 1.55] });
  const closeY = proximity.interpolate({ inputRange: [0, 1], outputRange: [0, 42] });
  const leftX = curtain.interpolate({ inputRange: [0, 1], outputRange: [-190, 0] });
  const rightX = curtain.interpolate({ inputRange: [0, 1], outputRange: [190, 0] });

  return (
    <View style={[styles.stage, !daily && styles.stageTarot]}>
      <Text style={styles.moon}>☾</Text>
      <Text style={styles.roomLabel}>{daily ? 'VELA’S ROOM' : 'TAROT ROOM'}</Text>

      <Animated.View
        style={[
          styles.velaPlaceholder,
          !daily && styles.velaPlaceholderReady,
          {
            transform: [
              { translateY: Animated.add(float, closeY) },
              { scale: closeScale },
            ],
          },
        ]}
      >
        <Text style={styles.velaInitial}>V</Text>
        <Text style={styles.velaState}>{daily ? idleScene.label.toUpperCase() : 'TAROT VELA'}</Text>
      </Animated.View>

      {phase === PHASE.IDLE && <Text style={styles.sceneDetail}>{idleScene.detail}</Text>}

      <View style={styles.speechBubble}>
        <Text style={styles.speech}>{speech}</Text>
      </View>

      {phase === PHASE.CURTAIN && (
        <View pointerEvents="none" style={styles.curtainLayer}>
          <Animated.View style={[styles.curtainPanel, styles.curtainLeft, { transform: [{ translateX: leftX }] }]} />
          <Animated.View style={[styles.curtainPanel, styles.curtainRight, { transform: [{ translateX: rightX }] }]} />
          <Text style={styles.curtainMoon}>☾</Text>
        </View>
      )}
    </View>
  );
}

function BackCard({ selected, special, onPress, index }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`第 ${index + 1} 張牌`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        selected && styles.cardSelected,
        special && styles.businessCard,
        pressed && styles.cardPressed,
      ]}
    >
      <Text style={styles.cardMoon}>{special ? '✦' : '☾'}</Text>
      <Text style={styles.cardIndex}>{index + 1}</Text>
    </Pressable>
  );
}

function RevealCard({ card, revealed, canReveal, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={revealed ? `${card.name}${card.reversed ? '逆位' : '正位'}` : '未翻開的塔羅牌'}
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
          <Text style={styles.tapHint}>{canReveal ? '點一下翻牌' : '先翻前一張'}</Text>
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

function ReadingBlock({ card, index }) {
  if (!card) return null;
  return (
    <View style={styles.analysisCard}>
      <Text style={styles.endEyebrow}>CARD {index + 1}</Text>
      <Text style={styles.analysisTitle}>{card.name} · {card.reversed ? '逆位' : '正位'}</Text>
      <Text style={styles.bodyCopy}>{cardReading(card, index)}</Text>
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
  const [cards, setCards] = useState(() => createReading());
  const [selectedIds, setSelectedIds] = useState([]);
  const [businessCardIndex, setBusinessCardIndex] = useState(() =>
    Math.random() < 0.05 ? Math.floor(Math.random() * 12) : null,
  );
  const [speech, setSpeech] = useState('……嗯？你來了。');
  const [revealCount, setRevealCount] = useState(0);
  const [analysisCount, setAnalysisCount] = useState(1);
  const [followupInput, setFollowupInput] = useState('');
  const [followupMessage, setFollowupMessage] = useState('');
  const [followupAnswered, setFollowupAnswered] = useState(false);
  const [supplementCard, setSupplementCard] = useState(null);
  const [supplementRevealed, setSupplementRevealed] = useState(false);

  const selectedCards = useMemo(
    () => selectedIds.map((id) => cards.find((card) => card.id === id)).filter(Boolean),
    [cards, selectedIds],
  );

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
    if (phase !== PHASE.DRAW || selectedIds.length !== 3) return undefined;
    const timer = setTimeout(() => {
      setRevealCount(0);
      setSpeech('好，就這三張。其他的我收走。');
      setPhase(PHASE.REVEAL);
    }, 650);
    return () => clearTimeout(timer);
  }, [phase, selectedIds]);

  useEffect(() => {
    if (phase !== PHASE.REVEAL || selectedCards.length !== 3 || revealCount !== selectedCards.length) {
      return undefined;
    }
    const timer = setTimeout(() => {
      setThinkingIndex(0);
      setPhase(PHASE.THINKING);
    }, 850);
    return () => clearTimeout(timer);
  }, [phase, revealCount, selectedCards.length]);

  useEffect(() => {
    if (phase !== PHASE.THINKING) return undefined;
    const timer = setTimeout(() => {
      if (thinkingIndex < THINKING_LINES.length - 1) {
        setThinkingIndex((value) => value + 1);
      } else {
        setAnalysisCount(1);
        setSpeech('好，先從第一張開始。');
        setPhase(PHASE.FIRST_READING);
      }
    }, 1050);
    return () => clearTimeout(timer);
  }, [phase, thinkingIndex]);

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
        setSpeech(next === 2 ? '第二張就是卡住你的地方。' : '最後一張，我覺得你要注意這裡。');
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
    setQuestionDraft(clean);
    setSpeech('好。先別想太多，憑感覺挑三張。');
    setPhase(PHASE.DRAW);
  }

  function chooseCard(card, index) {
    if (index === businessCardIndex) {
      Vibration.vibrate(35);
      setSpeech('啊！抱歉，那是我的名片。你當作沒看到。');
      setBusinessCardIndex(null);
      return;
    }

    setSelectedIds((current) => {
      if (current.includes(card.id)) {
        setSpeech('反悔也可以。再挑一張。');
        return current.filter((id) => id !== card.id);
      }
      if (current.length >= 3) return current;
      const next = [...current, card.id];
      Vibration.vibrate(12);
      setSpeech(next.length === 3 ? '好，就這三張。其他的我收走。' : `還差 ${3 - next.length} 張。`);
      return next;
    });
  }

  function revealCard(index) {
    if (index !== revealCount) return;
    Vibration.vibrate(25);
    const nextCount = revealCount + 1;
    setRevealCount(nextCount);
    if (nextCount === 1) setSpeech('……喔。這張有點意思。');
    else if (nextCount === 2) setSpeech('嗯，這兩張放在一起就不太單純了。');
    else setSpeech('好，我大概知道它們想說什麼了。');
  }

  function unlockFullReading() {
    setAnalysisCount(1);
    setSpeech('好。那我繼續講，你先別急著下結論。');
    setPhase(PHASE.FULL_READING);
  }

  function answerFollowup(message) {
    const clean = message.trim();
    if (!clean) return;
    setFollowupMessage(clean);
    setFollowupInput('');
    setFollowupAnswered(true);
    setSpeech('嗯，那我懂你卡住的點了。這裡補一張會比較有用。');
  }

  function beginSupplement() {
    const remaining = cards.filter((card) => !selectedIds.includes(card.id));
    const nextCard = remaining[Math.floor(Math.random() * remaining.length)] ?? createReading()[0];
    setSupplementCard({ ...nextCard, id: `supplement-${Date.now()}` });
    setSupplementRevealed(false);
    setSpeech('這次只補一張。你自己翻。');
    setPhase(PHASE.SUPPLEMENT);
  }

  function revealSupplement() {
    if (supplementRevealed) return;
    Vibration.vibrate(28);
    setSupplementRevealed(true);
    setSpeech('嗯，就是這張。它其實是在回答你剛剛那句話。');
  }

  function resetReading() {
    setCards(createReading());
    setSelectedIds([]);
    setRevealCount(0);
    setPrepareIndex(0);
    setThinkingIndex(0);
    setAnalysisCount(1);
    setQuestion('');
    setQuestionDraft('');
    setFollowupInput('');
    setFollowupMessage('');
    setFollowupAnswered(false);
    setSupplementCard(null);
    setSupplementRevealed(false);
    setIdleScene(pickIdleScene());
    setBusinessCardIndex(Math.random() < 0.05 ? Math.floor(Math.random() * 12) : null);
    setPhase(PHASE.IDLE);
    setSpeech('……嗯？你來了。');
    setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), 50);
  }

  const stageSpeech = phase === PHASE.CURTAIN
    ? PREPARE_LINES[prepareIndex]
    : phase === PHASE.THINKING
      ? THINKING_LINES[thinkingIndex]
      : speech;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <ScrollView ref={scrollRef} contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
        <Text style={styles.brand}>ASK VELA</Text>
        <Text style={styles.prototypeLabel}>INTERACTIVE TAROT · VERTICAL SLICE</Text>

        <VelaStage phase={phase} speech={stageSpeech} idleScene={idleScene} />

        {phase === PHASE.IDLE && (
          <View style={styles.actionArea}>
            <Text style={styles.bodyCopy}>她現在有自己的事在做。你可以直接打斷她。</Text>
            <Pressable style={styles.primaryButton} onPress={noticeVela}>
              <Text style={styles.primaryButtonText}>Vela，我想看塔羅</Text>
            </Pressable>
          </View>
        )}

        {phase === PHASE.NOTICE && (
          <View style={styles.actionArea}>
            <Text style={styles.bodyCopy}>Vela 突然靠近鏡頭，確認你是不是認真的。</Text>
            <Pressable style={styles.primaryButton} onPress={startCurtain}>
              <Text style={styles.primaryButtonText}>對，幫我看</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={resetReading}>
              <Text style={styles.secondaryButtonText}>算了，我只是路過</Text>
            </Pressable>
          </View>
        )}

        {phase === PHASE.CURTAIN && (
          <View style={styles.loadingArea}>
            <View style={styles.loadingTrack}>
              <View style={[styles.loadingFill, { width: `${((prepareIndex + 1) / PREPARE_LINES.length) * 100}%` }]} />
            </View>
            <Text style={styles.smallCopy}>布幕關上後，Vela 正在另一邊準備。</Text>
          </View>
        )}

        {phase === PHASE.QUESTION && (
          <View style={styles.tableSection}>
            <Text style={styles.sectionTitle}>今天想問什麼？</Text>
            <Text style={styles.sectionHint}>先把問題留給 Vela，等等抽牌時只要專心選。</Text>
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
                placeholder="或直接告訴 Vela 你想問的事……"
                placeholderTextColor="#725E7B"
                style={styles.textInput}
                returnKeyType="send"
                onSubmitEditing={() => submitQuestion()}
              />
              <Pressable style={styles.sendButton} onPress={() => submitQuestion()}>
                <Text style={styles.sendButtonText}>開始</Text>
              </Pressable>
            </View>
          </View>
        )}

        {phase === PHASE.DRAW && (
          <View style={styles.tableSection}>
            <View style={styles.questionChip}><Text style={styles.questionChipText}>「{question}」</Text></View>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>挑 3 張</Text>
                <Text style={styles.sectionHint}>選滿後 Vela 會直接把其他牌收走。</Text>
              </View>
              <Text style={styles.selectionCount}>{selectedIds.length}/3</Text>
            </View>
            <View style={styles.cardGrid}>
              {cards.map((card, index) => (
                <BackCard
                  key={card.id}
                  index={index}
                  special={index === businessCardIndex}
                  selected={selectedIds.includes(card.id)}
                  onPress={() => chooseCard(card, index)}
                />
              ))}
            </View>
            {selectedIds.length === 3 && <Text style={styles.autoAdvanceCopy}>Vela 正在把其他牌收起來……</Text>}
          </View>
        )}

        {phase === PHASE.REVEAL && (
          <View style={styles.tableSection}>
            <Text style={styles.sectionTitle}>一張一張翻開</Text>
            <Text style={styles.sectionHint}>第三張翻開後，Vela 會直接開始想。</Text>
            <View style={styles.revealRow}>
              {selectedCards.map((card, index) => (
                <RevealCard key={card.id} card={card} revealed={index < revealCount} canReveal={index === revealCount} onPress={() => revealCard(index)} />
              ))}
            </View>
          </View>
        )}

        {phase === PHASE.THINKING && (
          <View style={styles.thinkingSection}>
            <View style={styles.questionChip}><Text style={styles.questionChipText}>「{question}」</Text></View>
            <View style={styles.miniCardRow}>
              {selectedCards.map((card) => <MiniCard key={card.id} card={card} />)}
            </View>
            <View style={styles.thinkingDots}>
              <View style={styles.thinkingDot} /><View style={styles.thinkingDot} /><View style={styles.thinkingDot} />
            </View>
            <Text style={styles.smallCopy}>不用按任何東西，讓她想一下。</Text>
          </View>
        )}

        {phase === PHASE.FIRST_READING && (
          <View style={styles.tableSection}>
            <Text style={styles.sectionTitle}>Vela 開始解牌</Text>
            <ReadingBlock card={selectedCards[0]} index={0} />
          </View>
        )}

        {phase === PHASE.LOGIN_GATE && (
          <View style={styles.tableSection}>
            <Text style={styles.sectionTitle}>Vela 開始解牌</Text>
            <ReadingBlock card={selectedCards[0]} index={0} />
            <View style={styles.gateCard}>
              <Text style={styles.endEyebrow}>FREE READING</Text>
              <Text style={styles.analysisTitle}>後面兩張會把關係串起來。</Text>
              <Text style={styles.bodyCopy}>正式版這裡會要求登入，並提供一次完整免費體驗。Prototype 先直接模擬已登入。</Text>
              <Pressable style={styles.primaryButton} onPress={unlockFullReading}>
                <Text style={styles.primaryButtonText}>Prototype：登入並繼續</Text>
              </Pressable>
            </View>
          </View>
        )}

        {phase === PHASE.FULL_READING && (
          <View style={styles.tableSection}>
            <Text style={styles.sectionTitle}>Vela 的解讀</Text>
            {selectedCards.slice(0, analysisCount).map((card, index) => <ReadingBlock key={card.id} card={card} index={index} />)}
            {analysisCount === 3 && (
              <View style={styles.synthesisCard}>
                <Text style={styles.endEyebrow}>TOGETHER</Text>
                <Text style={styles.analysisTitle}>三張牌放在一起</Text>
                <Text style={styles.bodyCopy}>第一張像你現在的感受，第二張把真正的阻力指出來，第三張才是下一步。它們不是在替你決定，而是在提醒你：現在最需要處理的其實不是結果，而是你一直繞開的那個選擇。</Text>
              </View>
            )}
          </View>
        )}

        {phase === PHASE.FOLLOWUP && (
          <View style={styles.tableSection}>
            <Text style={styles.sectionTitle}>先別急著走</Text>
            <View style={styles.synthesisCard}>
              <Text style={styles.endEyebrow}>VELA WANTS TO ASK</Text>
              <Text style={styles.analysisTitle}>你現在真正怕的是「選錯」，還是「失去」？</Text>
              <Text style={styles.bodyCopy}>正式版這裡會把你剛剛的牌、原始問題與解讀一起留在對話裡。</Text>
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
                  <TextInput value={followupInput} onChangeText={setFollowupInput} placeholder="或自己問 Vela……" placeholderTextColor="#725E7B" style={styles.textInput} returnKeyType="send" onSubmitEditing={() => answerFollowup(followupInput)} />
                  <Pressable style={styles.sendButton} onPress={() => answerFollowup(followupInput)}><Text style={styles.sendButtonText}>送出</Text></Pressable>
                </View>
              </>
            )}
            {followupAnswered && (
              <View style={styles.followupResult}>
                <Text style={styles.userBubble}>{followupMessage}</Text>
                <Text style={styles.velaReply}>那這就不是單純問「結果會怎樣」了。你其實是在確認自己有沒有承受那個選擇的空間。我會建議補一張，只問「現在最值得注意的是什麼」。</Text>
                <Pressable style={styles.primaryButton} onPress={beginSupplement}><Text style={styles.primaryButtonText}>好，補一張</Text></Pressable>
                <Pressable style={styles.secondaryButton} onPress={resetReading}><Text style={styles.secondaryButtonText}>今天先到這裡</Text></Pressable>
              </View>
            )}
          </View>
        )}

        {phase === PHASE.SUPPLEMENT && supplementCard && (
          <View style={styles.tableSection}>
            <Text style={styles.sectionTitle}>補一張</Text>
            <Text style={styles.sectionHint}>這張只回答你剛剛的追問。</Text>
            <View style={styles.supplementWrap}>
              <RevealCard card={supplementCard} revealed={supplementRevealed} canReveal={!supplementRevealed} onPress={revealSupplement} />
            </View>
            {supplementRevealed && (
              <View style={styles.synthesisCard}>
                <Text style={styles.endEyebrow}>CLARIFIER</Text>
                <Text style={styles.analysisTitle}>{supplementCard.name} · {supplementCard.reversed ? '逆位' : '正位'}</Text>
                <Text style={styles.bodyCopy}>這張補牌不是推翻前面三張，而是把焦點縮小：你接下來先處理自己能控制的部分，比一直猜結果更有用。正式版會由同一份 reading context 產生真正的補牌解讀。</Text>
                <Text style={styles.velaReply}>Vela：好，這次我真的講完了。</Text>
                <Pressable style={styles.primaryButton} onPress={resetReading}><Text style={styles.primaryButtonText}>再看一次</Text></Pressable>
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
  screen: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 36, backgroundColor: '#100918' },
  brand: { color: '#F3DEFF', fontSize: 25, fontWeight: '800', letterSpacing: 4 },
  prototypeLabel: { marginTop: 5, color: '#9D86AA', fontSize: 10, letterSpacing: 1.5 },
  stage: { marginTop: 22, minHeight: 330, borderRadius: 28, borderWidth: 1, borderColor: '#3B2550', backgroundColor: '#1A1025', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: 20 },
  stageTarot: { backgroundColor: '#160D20', borderColor: '#5B386D' },
  moon: { position: 'absolute', top: 17, right: 22, color: '#D9B96E', fontSize: 31 },
  roomLabel: { position: 'absolute', top: 20, left: 22, color: '#735E7D', fontSize: 9, letterSpacing: 1.5, fontWeight: '700' },
  velaPlaceholder: { width: 150, height: 190, borderTopLeftRadius: 74, borderTopRightRadius: 74, borderBottomLeftRadius: 34, borderBottomRightRadius: 34, backgroundColor: '#2B1D36', borderWidth: 1, borderColor: '#594064', alignItems: 'center', justifyContent: 'center' },
  velaPlaceholderReady: { backgroundColor: '#392046', borderColor: '#9E77B2' },
  velaInitial: { color: '#F5E7FA', fontSize: 68, fontWeight: '300', fontFamily: 'serif' },
  velaState: { marginTop: 12, color: '#A993B5', fontSize: 9, letterSpacing: 1.2 },
  sceneDetail: { marginTop: 11, color: '#8F7A99', fontSize: 11, textAlign: 'center', maxWidth: 250 },
  speechBubble: { marginTop: 22, width: '100%', borderRadius: 18, backgroundColor: '#F0E4F4', paddingHorizontal: 16, paddingVertical: 14 },
  speech: { color: '#25182C', fontSize: 16, lineHeight: 23, textAlign: 'center', fontWeight: '600' },
  curtainLayer: { ...StyleSheet.absoluteFillObject, flexDirection: 'row', alignItems: 'stretch', justifyContent: 'center', zIndex: 20 },
  curtainPanel: { position: 'absolute', top: 0, bottom: 0, width: '52%', backgroundColor: '#4B205E' },
  curtainLeft: { left: 0, borderRightWidth: 1, borderRightColor: '#8C5DA0' },
  curtainRight: { right: 0, borderLeftWidth: 1, borderLeftColor: '#8C5DA0' },
  curtainMoon: { position: 'absolute', top: '42%', color: '#D9B96E', fontSize: 54, zIndex: 25 },
  actionArea: { marginTop: 24 },
  bodyCopy: { color: '#B8A8BF', fontSize: 14, lineHeight: 22 },
  primaryButton: { marginTop: 18, minHeight: 54, borderRadius: 16, backgroundColor: '#7D4A91', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  primaryButtonText: { color: '#FFF8FF', fontSize: 16, fontWeight: '800' },
  secondaryButton: { marginTop: 12, minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: '#70517D', alignItems: 'center', justifyContent: 'center' },
  secondaryButtonText: { color: '#D9C6E0', fontSize: 15, fontWeight: '700' },
  loadingArea: { marginTop: 26 },
  loadingTrack: { height: 6, borderRadius: 20, overflow: 'hidden', backgroundColor: '#2C2032' },
  loadingFill: { height: '100%', borderRadius: 20, backgroundColor: '#B58AC6' },
  smallCopy: { marginTop: 12, color: '#806E89', textAlign: 'center', fontSize: 12 },
  tableSection: { marginTop: 26 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14 },
  sectionTitle: { color: '#F2E8F4', fontSize: 19, fontWeight: '800' },
  sectionHint: { marginTop: 5, color: '#806E89', fontSize: 12, lineHeight: 18 },
  selectionCount: { color: '#C7A6D4', fontSize: 14, fontWeight: '700' },
  questionChip: { alignSelf: 'flex-start', maxWidth: '100%', marginBottom: 16, borderRadius: 999, borderWidth: 1, borderColor: '#533760', backgroundColor: '#1B1122', paddingHorizontal: 13, paddingVertical: 8 },
  questionChipText: { color: '#CBB7D2', fontSize: 12, lineHeight: 17 },
  cardGrid: { marginTop: 16, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  card: { width: '22.5%', aspectRatio: 0.62, borderRadius: 10, borderWidth: 1, borderColor: '#6B4B77', backgroundColor: '#24142F', alignItems: 'center', justifyContent: 'center' },
  cardSelected: { borderWidth: 2, borderColor: '#E4C6EE', transform: [{ translateY: -5 }], backgroundColor: '#3A2046' },
  businessCard: { borderStyle: 'dashed', borderColor: '#D6B56D', backgroundColor: '#30233A' },
  cardPressed: { opacity: 0.75, transform: [{ scale: 0.97 }] },
  cardMoon: { color: '#D4B46D', fontSize: 23 },
  cardIndex: { position: 'absolute', bottom: 7, color: '#795E85', fontSize: 9 },
  autoAdvanceCopy: { marginTop: 16, color: '#B58AC6', textAlign: 'center', fontSize: 12, fontWeight: '700' },
  revealRow: { marginTop: 18, flexDirection: 'row', gap: 10 },
  revealCard: { flex: 1, minHeight: 210, borderRadius: 14, borderWidth: 1, borderColor: '#62456F', backgroundColor: '#24142F', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  revealCardOpen: { backgroundColor: '#EBDFF0', borderColor: '#F8ECFB' },
  revealMoon: { color: '#D4B46D', fontSize: 34 },
  tapHint: { marginTop: 12, color: '#9B84A5', fontSize: 11, textAlign: 'center' },
  revealName: { color: '#291C30', fontSize: 19, fontWeight: '800', textAlign: 'center' },
  revealEnglish: { marginTop: 8, color: '#6D5A74', fontSize: 11, textAlign: 'center' },
  orientation: { marginTop: 20, color: '#7D4A91', fontSize: 13, fontWeight: '800' },
  thinkingSection: { marginTop: 26, alignItems: 'center' },
  miniCardRow: { width: '100%', flexDirection: 'row', gap: 10 },
  miniCard: { flex: 1, minHeight: 96, borderRadius: 13, borderWidth: 1, borderColor: '#5E416A', backgroundColor: '#24142F', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  miniCardName: { color: '#EBDFF0', fontSize: 14, fontWeight: '800', textAlign: 'center' },
  miniCardOrientation: { marginTop: 7, color: '#AE8CBA', fontSize: 11 },
  thinkingDots: { marginTop: 24, flexDirection: 'row', gap: 8 },
  thinkingDot: { width: 7, height: 7, borderRadius: 99, backgroundColor: '#B58AC6' },
  analysisCard: { marginTop: 18, borderRadius: 20, borderWidth: 1, borderColor: '#3C2A45', backgroundColor: '#18101F', padding: 18 },
  gateCard: { marginTop: 18, borderRadius: 20, borderWidth: 1, borderColor: '#6A4C77', backgroundColor: '#201328', padding: 18 },
  synthesisCard: { marginTop: 18, borderRadius: 20, borderWidth: 1, borderColor: '#4D3559', backgroundColor: '#18101F', padding: 18 },
  endEyebrow: { color: '#B58AC6', fontSize: 10, fontWeight: '800', letterSpacing: 1.8 },
  analysisTitle: { marginTop: 7, marginBottom: 10, color: '#F3E8F6', fontSize: 18, fontWeight: '800' },
  choiceList: { marginTop: 18, gap: 10 },
  choiceButton: { minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: '#5F436B', backgroundColor: '#1B1122', justifyContent: 'center', paddingHorizontal: 15 },
  choiceButtonText: { color: '#E8DCEB', fontSize: 14, lineHeight: 20 },
  inputRow: { marginTop: 14, flexDirection: 'row', gap: 10 },
  textInput: { flex: 1, minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: '#5F436B', backgroundColor: '#18101F', color: '#F2E8F4', paddingHorizontal: 14, fontSize: 14 },
  sendButton: { minWidth: 70, borderRadius: 14, backgroundColor: '#7D4A91', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  sendButtonText: { color: '#FFF8FF', fontSize: 14, fontWeight: '800' },
  followupResult: { marginTop: 18 },
  userBubble: { alignSelf: 'flex-end', maxWidth: '86%', borderRadius: 16, backgroundColor: '#6D427D', color: '#FFF8FF', paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, lineHeight: 20 },
  velaReply: { marginTop: 14, color: '#D7C6DC', fontSize: 14, lineHeight: 22 },
  supplementWrap: { marginTop: 18, width: '45%', alignSelf: 'center' },
});
