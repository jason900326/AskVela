import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  Vibration,
  View,
} from 'react-native';

const PHASE = {
  IDLE: 'idle',
  PREPARING: 'preparing',
  DRAW: 'draw',
  REVEAL: 'reveal',
};

const PREPARE_LINES = [
  '正在把頭髮綁起來……',
  '把桌上的垃圾藏到你看不到的地方……',
  '正在喬一個位子給你坐……',
  '擺上我很珍貴的牌……',
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

function shuffle(input) {
  const array = [...input];
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
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

function VelaStage({ phase, speech }) {
  const float = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          toValue: -5,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(float, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [float]);

  const ready = phase !== PHASE.IDLE && phase !== PHASE.PREPARING;

  return (
    <View style={styles.stage}>
      <Text style={styles.moon}>☾</Text>
      <Animated.View
        style={[
          styles.velaPlaceholder,
          ready && styles.velaPlaceholderReady,
          { transform: [{ translateY: float }] },
        ]}
      >
        <Text style={styles.velaInitial}>V</Text>
        <Text style={styles.velaState}>{ready ? 'TAROT VELA' : 'OFF-DUTY VELA'}</Text>
      </Animated.View>

      <View style={styles.speechBubble}>
        <Text style={styles.speech}>{speech}</Text>
      </View>
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

export default function App() {
  const [phase, setPhase] = useState(PHASE.IDLE);
  const [prepareIndex, setPrepareIndex] = useState(0);
  const [cards, setCards] = useState(() => createReading());
  const [selectedIds, setSelectedIds] = useState([]);
  const [businessCardIndex, setBusinessCardIndex] = useState(() =>
    Math.random() < 0.05 ? Math.floor(Math.random() * 12) : null,
  );
  const [speech, setSpeech] = useState('你今天是來找我聊天，還是真的想看牌？');
  const [revealCount, setRevealCount] = useState(0);

  useEffect(() => {
    if (phase !== PHASE.PREPARING) return undefined;

    const timer = setTimeout(() => {
      if (prepareIndex < PREPARE_LINES.length - 1) {
        setPrepareIndex((value) => value + 1);
      } else {
        setPhase(PHASE.DRAW);
        setSpeech('好了。坐吧，挑三張。');
      }
    }, 1150);

    return () => clearTimeout(timer);
  }, [phase, prepareIndex]);

  const selectedCards = useMemo(
    () => selectedIds.map((id) => cards.find((card) => card.id === id)).filter(Boolean),
    [cards, selectedIds],
  );

  function beginReading() {
    setPrepareIndex(0);
    setPhase(PHASE.PREPARING);
    setSpeech('……現在？好啦，等我一下。');
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

      if (current.length >= 3) {
        setSpeech('三張就夠了，不要貪心。');
        return current;
      }

      const next = [...current, card.id];
      Vibration.vibrate(12);
      setSpeech(next.length === 3 ? '好，就這三張。' : `還差 ${3 - next.length} 張。`);
      return next;
    });
  }

  function lockSelection() {
    if (selectedIds.length !== 3) return;
    setRevealCount(0);
    setPhase(PHASE.REVEAL);
    setSpeech('一張一張來。別急。');
  }

  function revealCard(index) {
    if (index !== revealCount) return;

    Vibration.vibrate(25);
    const nextCount = revealCount + 1;
    setRevealCount(nextCount);

    if (nextCount === 1) {
      setSpeech('……喔。這張有點意思。');
    } else if (nextCount === 2) {
      setSpeech('嗯，這兩張放在一起就不太單純了。');
    } else {
      setSpeech('好，我大概知道它們想說什麼了。');
    }
  }

  function resetReading() {
    setCards(createReading());
    setSelectedIds([]);
    setRevealCount(0);
    setPrepareIndex(0);
    setBusinessCardIndex(Math.random() < 0.05 ? Math.floor(Math.random() * 12) : null);
    setPhase(PHASE.IDLE);
    setSpeech('你今天是來找我聊天，還是真的想看牌？');
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.screen}>
        <Text style={styles.brand}>ASK VELA</Text>
        <Text style={styles.prototypeLabel}>INTERACTIVE TAROT · VERTICAL SLICE</Text>

        <VelaStage
          phase={phase}
          speech={phase === PHASE.PREPARING ? PREPARE_LINES[prepareIndex] : speech}
        />

        {phase === PHASE.IDLE && (
          <View style={styles.actionArea}>
            <Text style={styles.bodyCopy}>
              第一版先不接 AI。這裡只驗證「Vela 像不像一個真的在你面前準備占卜的人」。
            </Text>
            <Pressable style={styles.primaryButton} onPress={beginReading}>
              <Text style={styles.primaryButtonText}>幫我看塔羅</Text>
            </Pressable>
          </View>
        )}

        {phase === PHASE.PREPARING && (
          <View style={styles.loadingArea}>
            <View style={styles.loadingTrack}>
              <View
                style={[
                  styles.loadingFill,
                  { width: `${((prepareIndex + 1) / PREPARE_LINES.length) * 100}%` },
                ]}
              />
            </View>
            <Text style={styles.smallCopy}>Vela 正在把自己切換成工作模式。</Text>
          </View>
        )}

        {phase === PHASE.DRAW && (
          <View style={styles.tableSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>挑 3 張</Text>
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

            <Pressable
              disabled={selectedIds.length !== 3}
              onPress={lockSelection}
              style={[
                styles.primaryButton,
                selectedIds.length !== 3 && styles.primaryButtonDisabled,
              ]}
            >
              <Text style={styles.primaryButtonText}>把這三張留下</Text>
            </Pressable>
          </View>
        )}

        {phase === PHASE.REVEAL && (
          <View style={styles.tableSection}>
            <Text style={styles.sectionTitle}>翻開你剛剛選的牌</Text>

            <View style={styles.revealRow}>
              {selectedCards.map((card, index) => (
                <RevealCard
                  key={card.id}
                  card={card}
                  revealed={index < revealCount}
                  canReveal={index === revealCount}
                  onPress={() => revealCard(index)}
                />
              ))}
            </View>

            {revealCount === selectedCards.length && (
              <View style={styles.prototypeEnd}>
                <Text style={styles.endEyebrow}>PROTOTYPE END</Text>
                <Text style={styles.endTitle}>下一步才接真正的 Vela 解讀。</Text>
                <Text style={styles.bodyCopy}>
                  目前這一刀只驗證角色、節奏、抽牌、低機率彩蛋與翻牌反應。
                </Text>
                <Pressable style={styles.secondaryButton} onPress={resetReading}>
                  <Text style={styles.secondaryButtonText}>再玩一次</Text>
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
  safeArea: {
    flex: 1,
    backgroundColor: '#100918',
  },
  screen: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 36,
    backgroundColor: '#100918',
  },
  brand: {
    color: '#F3DEFF',
    fontSize: 25,
    fontWeight: '800',
    letterSpacing: 4,
  },
  prototypeLabel: {
    marginTop: 5,
    color: '#9D86AA',
    fontSize: 10,
    letterSpacing: 1.5,
  },
  stage: {
    marginTop: 22,
    minHeight: 330,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#3B2550',
    backgroundColor: '#1A1025',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    padding: 20,
  },
  moon: {
    position: 'absolute',
    top: 17,
    right: 22,
    color: '#D9B96E',
    fontSize: 31,
  },
  velaPlaceholder: {
    width: 150,
    height: 190,
    borderTopLeftRadius: 74,
    borderTopRightRadius: 74,
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 34,
    backgroundColor: '#2B1D36',
    borderWidth: 1,
    borderColor: '#594064',
    alignItems: 'center',
    justifyContent: 'center',
  },
  velaPlaceholderReady: {
    backgroundColor: '#392046',
    borderColor: '#9E77B2',
  },
  velaInitial: {
    color: '#F5E7FA',
    fontSize: 68,
    fontWeight: '300',
    fontFamily: 'serif',
  },
  velaState: {
    marginTop: 12,
    color: '#A993B5',
    fontSize: 9,
    letterSpacing: 1.2,
  },
  speechBubble: {
    marginTop: 22,
    width: '100%',
    borderRadius: 18,
    backgroundColor: '#F0E4F4',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  speech: {
    color: '#25182C',
    fontSize: 16,
    lineHeight: 23,
    textAlign: 'center',
    fontWeight: '600',
  },
  actionArea: {
    marginTop: 24,
  },
  bodyCopy: {
    color: '#B8A8BF',
    fontSize: 14,
    lineHeight: 22,
  },
  primaryButton: {
    marginTop: 18,
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: '#7D4A91',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  primaryButtonDisabled: {
    opacity: 0.35,
  },
  primaryButtonText: {
    color: '#FFF8FF',
    fontSize: 16,
    fontWeight: '800',
  },
  loadingArea: {
    marginTop: 26,
  },
  loadingTrack: {
    height: 6,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#2C2032',
  },
  loadingFill: {
    height: '100%',
    borderRadius: 20,
    backgroundColor: '#B58AC6',
  },
  smallCopy: {
    marginTop: 12,
    color: '#806E89',
    textAlign: 'center',
    fontSize: 12,
  },
  tableSection: {
    marginTop: 26,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    color: '#F2E8F4',
    fontSize: 19,
    fontWeight: '800',
  },
  selectionCount: {
    color: '#C7A6D4',
    fontSize: 14,
    fontWeight: '700',
  },
  cardGrid: {
    marginTop: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  card: {
    width: '22.5%',
    aspectRatio: 0.62,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#6B4B77',
    backgroundColor: '#24142F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardSelected: {
    borderWidth: 2,
    borderColor: '#E4C6EE',
    transform: [{ translateY: -5 }],
    backgroundColor: '#3A2046',
  },
  businessCard: {
    borderStyle: 'dashed',
    borderColor: '#D6B56D',
    backgroundColor: '#30233A',
  },
  cardPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.97 }],
  },
  cardMoon: {
    color: '#D4B46D',
    fontSize: 23,
  },
  cardIndex: {
    position: 'absolute',
    bottom: 7,
    color: '#795E85',
    fontSize: 9,
  },
  revealRow: {
    marginTop: 18,
    flexDirection: 'row',
    gap: 10,
  },
  revealCard: {
    flex: 1,
    minHeight: 210,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#62456F',
    backgroundColor: '#24142F',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  revealCardOpen: {
    backgroundColor: '#EBDFF0',
    borderColor: '#F8ECFB',
  },
  revealMoon: {
    color: '#D4B46D',
    fontSize: 34,
  },
  tapHint: {
    marginTop: 12,
    color: '#9B84A5',
    fontSize: 11,
    textAlign: 'center',
  },
  revealName: {
    color: '#291C30',
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'center',
  },
  revealEnglish: {
    marginTop: 8,
    color: '#6D5A74',
    fontSize: 11,
    textAlign: 'center',
  },
  orientation: {
    marginTop: 20,
    color: '#7D4A91',
    fontSize: 13,
    fontWeight: '800',
  },
  prototypeEnd: {
    marginTop: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#3C2A45',
    backgroundColor: '#18101F',
    padding: 18,
  },
  endEyebrow: {
    color: '#B58AC6',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.8,
  },
  endTitle: {
    marginTop: 7,
    marginBottom: 10,
    color: '#F3E8F6',
    fontSize: 18,
    fontWeight: '800',
  },
  secondaryButton: {
    marginTop: 18,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#70517D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#D9C6E0',
    fontSize: 15,
    fontWeight: '700',
  },
});
