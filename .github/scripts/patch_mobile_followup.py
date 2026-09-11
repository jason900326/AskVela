from pathlib import Path


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 match, found {count}")
    return text.replace(old, new, 1)


app_path = Path("mobile/App.js")
app = app_path.read_text()

app = replace_once(
    app,
    "  drawTarotReading,\n  interpretTarotReading,",
    "  drawTarotReading,\n  followUpTarotReading,\n  interpretTarotReading,",
    "import followUpTarotReading",
)

app = replace_once(
    app,
    "  const [followupInput, setFollowupInput] = useState('');\n  const [followupMessage, setFollowupMessage] = useState('');\n  const [followupAnswered, setFollowupAnswered] = useState(false);",
    "  const [followupInput, setFollowupInput] = useState('');\n  const [followupMessage, setFollowupMessage] = useState('');\n  const [followupAnswered, setFollowupAnswered] = useState(false);\n  const [followupAnswer, setFollowupAnswer] = useState('');\n  const [followupPracticalFocus, setFollowupPracticalFocus] = useState('');\n  const [followupLoading, setFollowupLoading] = useState(false);",
    "follow-up state",
)

app = replace_once(
    app,
    "    if (phase !== PHASE.FOLLOWUP || !followupAnswered) return undefined;",
    "    if (phase !== PHASE.FOLLOWUP || !followupAnswered || followupLoading || !followupAnswer) return undefined;",
    "follow-up transition guard",
)
app = replace_once(
    app,
    "  }, [phase, followupAnswered]);",
    "  }, [phase, followupAnswered, followupLoading, followupAnswer]);",
    "follow-up transition deps",
)

old_handler = """  function answerFollowup(message) {
    const clean = message.trim();
    if (!clean) return;
    setFollowupMessage(clean);
    setFollowupInput('');
    setFollowupAnswered(true);
    setSpeech('嗯……等一下。');
  }
"""
new_handler = """  async function answerFollowup(message) {
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
"""
app = replace_once(app, old_handler, new_handler, "answerFollowup handler")

app = replace_once(
    app,
    "    setFollowupInput('');\n    setFollowupMessage('');\n    setFollowupAnswered(false);",
    "    setFollowupInput('');\n    setFollowupMessage('');\n    setFollowupAnswered(false);\n    setFollowupAnswer('');\n    setFollowupPracticalFocus('');\n    setFollowupLoading(false);",
    "reset follow-up state",
)

old_followup_ui = """            {followupAnswered && (
              <View style={styles.followupResult}>
                <Text style={styles.userBubble}>{followupMessage}</Text>
                <Text style={styles.velaReply}>等一下，我想確認一件事。</Text>
              </View>
            )}
"""
new_followup_ui = """            {followupAnswered && (
              <View style={styles.followupResult}>
                <Text style={styles.userBubble}>{followupMessage}</Text>
                <Text style={styles.velaReply}>{followupLoading ? '……' : followupAnswer}</Text>
                {!followupLoading && !!followupPracticalFocus && (
                  <Text style={styles.practicalFocus}>{followupPracticalFocus}</Text>
                )}
              </View>
            )}
"""
app = replace_once(app, old_followup_ui, new_followup_ui, "follow-up result UI")

old_supplement_open = """        {phase === PHASE.SUPPLEMENT && supplementCard && (
          <View style={styles.tableSection}>
            <View style={styles.supplementWrap}>
"""
new_supplement_open = """        {phase === PHASE.SUPPLEMENT && supplementCard && (
          <View style={styles.tableSection}>
            {!!followupAnswer && (
              <Text style={styles.velaReply}>{followupAnswer}</Text>
            )}
            <View style={styles.supplementWrap}>
"""
app = replace_once(app, old_supplement_open, new_supplement_open, "preserve follow-up answer during supplement")

app_path.write_text(app)

api_path = Path("mobile/vela-api.js")
api = api_path.read_text()
marker = "export function normalizeDrawCards(draw) {"
if api.count(marker) != 1:
    raise SystemExit(f"vela-api marker: expected 1 match, found {api.count(marker)}")

followup_fn = """export function followUpTarotReading({
  question,
  readingId,
  selectedCardIndexes,
  requestId,
  message,
  history = [],
  initialReading,
  spreadId = DEFAULT_SPREAD_ID,
}) {
  const operationId = `${requestId}:follow-up:${history.length + 1}`;
  return postJson(
    '/api/readings/follow-up',
    {
      question,
      spreadId,
      requestId,
      readingId,
      selectedCardIndexes,
      message,
      history,
      initialReading,
    },
    operationId,
  );
}

"""
api = api.replace(marker, followup_fn + marker, 1)
api_path.write_text(api)
