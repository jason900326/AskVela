from pathlib import Path
import re

path = Path('mobile/App.js')
text = path.read_text()

# Remove auto-advance timers for reading, follow-up, and supplement phases.
patterns = [
    r"\n  useEffect\(\(\) => \{\n    if \(phase !== PHASE\.FIRST_READING\) return undefined;.*?\n  \}, \[phase\]\);\n",
    r"\n  useEffect\(\(\) => \{\n    if \(phase !== PHASE\.FULL_READING\) return undefined;.*?\n  \}, \[phase, analysisCount\]\);\n",
    r"\n  useEffect\(\(\) => \{\n    if \(phase !== PHASE\.FOLLOWUP \|\| !followupAnswered \|\| followupLoading \|\| !followupAnswer\) return undefined;.*?\n  \}, \[phase, followupAnswered, followupLoading, followupAnswer\]\);\n",
    r"\n  useEffect\(\(\) => \{\n    if \(phase !== PHASE\.SUPPLEMENT \|\| !supplementCard \|\| supplementRevealed\) return undefined;.*?\n  \}, \[phase, supplementCard, supplementRevealed\]\);\n",
]
for pattern in patterns:
    text, count = re.subn(pattern, '\n', text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f'expected exactly one pacing effect match for {pattern[:60]!r}, got {count}')

anchor = """  function unlockFullReading() {
    setAnalysisCount(1);
    setSpeech('好。那我繼續講。');
    setPhase(PHASE.FULL_READING);
  }

"""
insert = """  function unlockFullReading() {
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

    setSpeech('三張放在一起，我反而想先問你一件事。');
    setPhase(PHASE.FOLLOWUP);
  }

  function openSupplement() {
    if (followupLoading || !followupAnswer) return;
    const [name, english] = TAROT_POOL[Math.floor(Math.random() * TAROT_POOL.length)];
    setSupplementCard({ id: `supplement-${Date.now()}`, name, english, reversed: Math.random() < 0.5 });
    setSupplementRevealed(false);
    setSpeech('我再補一張。先別急，你自己翻。');
    setPhase(PHASE.SUPPLEMENT);
  }

  function revealSupplement() {
    if (!supplementCard || supplementRevealed) return;
    Vibration.vibrate(28);
    setSupplementRevealed(true);
    setSpeech('……嗯，果然。');
  }

"""
if text.count(anchor) != 1:
    raise SystemExit(f'unlockFullReading anchor count={text.count(anchor)}')
text = text.replace(anchor, insert, 1)

old_first = """        {phase === PHASE.FIRST_READING && (
          <View style={styles.tableSection}>
            <ReadingBlock card={drawCards[0]} index={0} interpretation={interpretation} />
          </View>
        )}
"""
new_first = """        {phase === PHASE.FIRST_READING && (
          <View style={styles.tableSection}>
            <ReadingBlock card={drawCards[0]} index={0} interpretation={interpretation} />
            <Pressable style={styles.primaryButton} onPress={continueAfterFirstReading}>
              <Text style={styles.primaryButtonText}>我看完了，繼續</Text>
            </Pressable>
          </View>
        )}
"""
if text.count(old_first) != 1:
    raise SystemExit('FIRST_READING UI anchor mismatch')
text = text.replace(old_first, new_first, 1)

old_full = """        {phase === PHASE.FULL_READING && (
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
"""
new_full = """        {phase === PHASE.FULL_READING && (
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
            <Pressable style={styles.primaryButton} onPress={advanceFullReading}>
              <Text style={styles.primaryButtonText}>{analysisCount < 3 ? '看下一張' : '我看完了，繼續'}</Text>
            </Pressable>
          </View>
        )}
"""
if text.count(old_full) != 1:
    raise SystemExit('FULL_READING UI anchor mismatch')
text = text.replace(old_full, new_full, 1)

old_followup = """            {followupAnswered && (
              <View style={styles.followupResult}>
                <Text style={styles.userBubble}>{followupMessage}</Text>
                <Text style={styles.velaReply}>{followupLoading ? '……' : followupAnswer}</Text>
                {!followupLoading && !!followupPracticalFocus && (
                  <Text style={styles.practicalFocus}>{followupPracticalFocus}</Text>
                )}
              </View>
            )}
"""
new_followup = """            {followupAnswered && (
              <View style={styles.followupResult}>
                <Text style={styles.userBubble}>{followupMessage}</Text>
                <Text style={styles.velaReply}>{followupLoading ? '……' : followupAnswer}</Text>
                {!followupLoading && !!followupPracticalFocus && (
                  <Text style={styles.practicalFocus}>{followupPracticalFocus}</Text>
                )}
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
"""
if text.count(old_followup) != 1:
    raise SystemExit('FOLLOWUP UI anchor mismatch')
text = text.replace(old_followup, new_followup, 1)

old_supplement = """            <View style={styles.supplementWrap}>
              <RevealCard card={supplementCard} revealed={supplementRevealed} canReveal={false} onPress={() => {}} lockedHint="" />
            </View>
"""
new_supplement = """            <View style={styles.supplementWrap}>
              <RevealCard
                card={supplementCard}
                revealed={supplementRevealed}
                canReveal={!supplementRevealed}
                onPress={revealSupplement}
                lockedHint=""
              />
            </View>
"""
if text.count(old_supplement) != 1:
    raise SystemExit('SUPPLEMENT reveal UI anchor mismatch')
text = text.replace(old_supplement, new_supplement, 1)

path.write_text(text)
