from pathlib import Path
import re

p = Path('mobile/App.js')
s = p.read_text()


def replace_once(old, new, label):
    global s
    count = s.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, found {count}')
    s = s.replace(old, new, 1)


replace_once(
    "  Animated,\n  Pressable,",
    "  Animated,\n  Image,\n  Pressable,",
    'Image import',
)

replace_once(
    "} from './vela-api';\n\nconst PHASE = {",
    "} from './vela-api';\n\nconst VELA_ART = {\n  ready: require('./assets/vela/ready.png'),\n  reading: require('./assets/vela/reading.png'),\n  thinking: require('./assets/vela/thinking.png'),\n  asking: require('./assets/vela/asking.png'),\n  clarifier: require('./assets/vela/clarifier.png'),\n};\n\nconst PHASE = {",
    'Vela art constants',
)

new_stage = r'''function VelaStage({ phase, speech, idleScene, pose = 'ready' }) {
  const proximity = useRef(new Animated.Value(0)).current;
  const curtain = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(proximity, {
      toValue: phase === PHASE.NOTICE ? 1 : 0,
      friction: 8,
      tension: 65,
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
  const closeScale = proximity.interpolate({ inputRange: [0, 1], outputRange: [1, 1.24] });
  const closeY = proximity.interpolate({ inputRange: [0, 1], outputRange: [0, 22] });
  const leftX = curtain.interpolate({ inputRange: [0, 1], outputRange: [-190, 0] });
  const rightX = curtain.interpolate({ inputRange: [0, 1], outputRange: [190, 0] });
  const art = VELA_ART[pose] || VELA_ART.ready;

  return (
    <View style={[styles.stage, !daily && styles.stageTarot]}>
      <Text style={styles.moon}>☾</Text>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.velaPortraitWrap,
          { transform: [{ translateY: closeY }, { scale: closeScale }] },
        ]}
      >
        <Image
          source={art}
          resizeMode="contain"
          style={styles.velaPortrait}
          accessibilityLabel={`Vela · ${daily ? idleScene?.label || '待機' : pose}`}
        />
      </Animated.View>
      <View style={styles.speechBubble}>
        <Text style={styles.speakerTag}>VELA</Text>
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

function BackCard'''

s, count = re.subn(
    r"function VelaStage\([\s\S]*?\n}\n\nfunction BackCard",
    new_stage,
    s,
    count=1,
)
if count != 1:
    raise SystemExit(f'VelaStage replacement: expected 1 match, found {count}')

replace_once(
    "            : readingDialogue || speech;\n\n  return (",
    "            : readingDialogue || speech;\n\n  const velaPose = phase === PHASE.THINKING\n    ? 'thinking'\n    : phase === PHASE.NOTICE\n      ? 'asking'\n      : phase === PHASE.FOLLOWUP\n        ? (followupLoading ? 'thinking' : followupAnswered ? 'reading' : 'asking')\n        : phase === PHASE.SUPPLEMENT\n          ? (supplementRevealed ? 'clarifier' : 'reading')\n          : [PHASE.FIRST_READING, PHASE.LOGIN_GATE, PHASE.FULL_READING, PHASE.SYNTHESIS].includes(phase)\n            ? 'reading'\n            : 'ready';\n\n  return (",
    'pose state',
)

replace_once(
    "        <VelaStage phase={phase} speech={stageSpeech} idleScene={idleScene} />",
    "        <VelaStage phase={phase} speech={stageSpeech} idleScene={idleScene} pose={velaPose} />",
    'VelaStage call',
)

old_styles = """  stage: { minHeight: 420, borderRadius: 28, borderWidth: 1, borderColor: '#3B2550', backgroundColor: '#1A1025', alignItems: 'center', justifyContent: 'flex-start', overflow: 'hidden', padding: 20, paddingBottom: 128 },
  stageTarot: { backgroundColor: '#160D20', borderColor: '#5B386D' },
  moon: { position: 'absolute', top: 17, right: 22, color: '#D9B96E', fontSize: 31 },
  velaPlaceholder: { marginTop: 26, width: 200, height: 235, borderTopLeftRadius: 96, borderTopRightRadius: 96, borderBottomLeftRadius: 38, borderBottomRightRadius: 38, backgroundColor: '#2B1D36', borderWidth: 1, borderColor: '#594064', alignItems: 'center', justifyContent: 'center' },
  velaPlaceholderReady: { backgroundColor: '#392046', borderColor: '#9E77B2' },
  velaInitial: { color: '#F5E7FA', fontSize: 68, fontWeight: '300', fontFamily: 'serif' },
  velaState: { marginTop: 12, color: '#A993B5', fontSize: 9, letterSpacing: 1.2 },
  speechBubble: { position: 'absolute', left: 16, right: 16, bottom: 16, minHeight: 92, borderRadius: 18, backgroundColor: '#F0E4F4', paddingHorizontal: 16, paddingTop: 18, paddingBottom: 14 },
"""
new_styles = """  stage: { minHeight: 458, borderRadius: 28, borderWidth: 1, borderColor: '#3B2550', backgroundColor: '#1A1025', alignItems: 'center', justifyContent: 'flex-start', overflow: 'hidden', padding: 16, paddingBottom: 126 },
  stageTarot: { backgroundColor: '#160D20', borderColor: '#5B386D' },
  moon: { position: 'absolute', top: 17, right: 22, color: '#D9B96E', fontSize: 31, zIndex: 3 },
  velaPortraitWrap: { marginTop: 3, width: '96%', height: 326, alignItems: 'center', justifyContent: 'flex-end', zIndex: 1 },
  velaPortrait: { width: '100%', height: '100%' },
  speechBubble: { position: 'absolute', left: 16, right: 16, bottom: 16, minHeight: 92, borderRadius: 18, backgroundColor: '#F0E4F4', paddingHorizontal: 16, paddingTop: 18, paddingBottom: 14, zIndex: 5 },
"""
replace_once(old_styles, new_styles, 'stage portrait styles')

p.write_text(s)
