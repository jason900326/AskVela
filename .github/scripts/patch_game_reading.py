from pathlib import Path
import re


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 match, found {count}")
    return text.replace(old, new, 1)

# --- Backend: game-oriented structured output while preserving old fields ---
p = Path('lib/reading-prompts.js')
t = p.read_text()

t = replace_once(t,
"""      cardId: { type: \"string\" },
      positionRole: { type: \"string\" },
      contextInterpretation: { type: \"string\" },
      practicalFocus: { type: \"string\" },""",
"""      cardId: { type: \"string\" },
      positionRole: { type: \"string\" },
      coreJudgment: { type: \"string\" },
      briefReason: { type: \"string\" },
      recap: { type: \"string\" },
      contextInterpretation: { type: \"string\" },
      practicalFocus: { type: \"string\" },""",
'layer B schema')

t = t.replace(
    '"For each card, contextInterpretation should usually be 2-3 substantive sentences: explain what this specific card, orientation, and spread position add to the user\'s actual question. practicalFocus stays one short sentence.",',
    '"For each card, write for an interactive character scene, not a report. coreJudgment is the line Vela says out loud: one direct, specific sentence, normally 18-48 Traditional Chinese characters, explicitly tied to the user\'s actual concern. briefReason is only 1-2 short sentences explaining why the card supports that judgment. recap is a compact memory line, ideally 10-24 characters, that still makes sense after the card collapses. contextInterpretation stays compatible with the web UI but should also be concise (normally 1-2 substantive sentences). practicalFocus is one concrete short next step, preferably under 28 Traditional Chinese characters.",',
)
# Add anti-generic constraint right after explicit connection instruction.
t = t.replace(
    '"Do not merely paraphrase the source meaning. Make the connection to the user\'s wording explicit while preserving uncertainty.",',
    '"Do not merely paraphrase the source meaning. Make the connection to the user\'s wording explicit while preserving uncertainty.",\n    "Avoid generic tarot exposition. The user should immediately understand what this card changes about THEIR question, not learn a textbook definition of the card.",\n    "coreJudgment must be the strongest useful interpretation you can support from the evidence. Do not bury the point after background explanation.",',
)
p.write_text(t)

p = Path('lib/reading-interpreter.js')
t = p.read_text()
t = replace_once(t,
"""    contextInterpretation: layerB.cards[index].contextInterpretation,
    positionRole: layerB.cards[index].positionRole,
    practicalFocus: layerB.cards[index].practicalFocus,""",
"""    contextInterpretation: layerB.cards[index].contextInterpretation,
    positionRole: layerB.cards[index].positionRole,
    coreJudgment: layerB.cards[index].coreJudgment,
    briefReason: layerB.cards[index].briefReason,
    recap: layerB.cards[index].recap,
    practicalFocus: layerB.cards[index].practicalFocus,""",
'card mapping')
p.write_text(t)

# Update interpreter tests/mocks anywhere Layer B card fixtures are defined.
p = Path('test/reading-interpreter.test.js')
t = p.read_text()
pattern = r"(positionRole:\s*`?[^\n]+\n\s*)(contextInterpretation:)"
t, n = re.subn(pattern, r"\1coreJudgment: `核心判斷 ${index + 1}`,\n        briefReason: `簡短理由 ${index + 1}`,\n        recap: `摘要 ${index + 1}`,\n        \2", t)
# Some fixtures may use literal strings rather than index templates. Patch remaining object blocks conservatively.
if 'coreJudgment' not in t:
    raise SystemExit('failed to add Layer B game fields to tests')
p.write_text(t)

# --- Mobile game presentation ---
p = Path('mobile/App.js')
t = p.read_text()

# Add synthesis phase.
t = replace_once(t,
"""  FULL_READING: 'full-reading',
  FOLLOWUP: 'followup',""",
"""  FULL_READING: 'full-reading',
  SYNTHESIS: 'synthesis',
  FOLLOWUP: 'followup',""",
'phase synthesis')

# Richer mock output mirrors live schema.
old_mock = """    cards: cards.map((card, index) => ({
      cardId: card.cardId,
      contextInterpretation: mockCardReading(card, index),
      practicalFocus: index === 2 ? '先處理你能控制的那一步。' : '',
    })),"""
new_mock = """    cards: cards.map((card, index) => ({
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
    })),"""
t = replace_once(t, old_mock, new_mock, 'mock cards')

# Replace report ReadingBlock with game-focused components.
start = t.index('function ReadingBlock(')
end = t.index('\nexport default function App()', start)
new_components = r'''function getGameReading(resultCard, card, index) {
  const fallback = mockCardReading(card, index);
  return {
    coreJudgment: resultCard?.coreJudgment || resultCard?.contextInterpretation?.split('。')?.[0] || fallback,
    briefReason: resultCard?.briefReason || resultCard?.contextInterpretation || fallback,
    recap: resultCard?.recap || resultCard?.coreJudgment || `${card?.name}：${fallback}`,
    practicalFocus: resultCard?.practicalFocus || '',
  };
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
'''
t = t[:start] + new_components + t[end:]

# Make Vela's dialogue bubble carry the active core judgment in reading phases.
old_stage = """  const stageSpeech = phase === PHASE.CURTAIN
    ? PREPARE_LINES[prepareIndex]
    : phase === PHASE.THINKING
      ? THINKING_LINES[thinkingIndex]
      : speech;"""
new_stage = """  const activeReadingIndex = phase === PHASE.FIRST_READING
    ? 0
    : phase === PHASE.FULL_READING
      ? Math.max(0, analysisCount - 1)
      : null;
  const activeResultCard = activeReadingIndex === null ? null : interpretation?.cards?.[activeReadingIndex];
  const activeDrawCard = activeReadingIndex === null ? null : drawCards[activeReadingIndex];
  const activeGameReading = activeReadingIndex === null
    ? null
    : getGameReading(activeResultCard, activeDrawCard, activeReadingIndex);

  const stageSpeech = phase === PHASE.CURTAIN
    ? PREPARE_LINES[prepareIndex]
    : phase === PHASE.THINKING
      ? THINKING_LINES[thinkingIndex]
      : activeGameReading?.coreJudgment || speech;"""
t = replace_once(t, old_stage, new_stage, 'stage speech')

# Include synthesis in auto-scroll phase list.
t = t.replace('PHASE.LOGIN_GATE, PHASE.FULL_READING, PHASE.FOLLOWUP, PHASE.SUPPLEMENT', 'PHASE.LOGIN_GATE, PHASE.FULL_READING, PHASE.SYNTHESIS, PHASE.FOLLOWUP, PHASE.SUPPLEMENT')

# Advance after third card into synthesis rather than directly follow-up.
old_advance = """    setSpeech('三張放在一起，我反而想先問你一件事。');
    setPhase(PHASE.FOLLOWUP);
  }

  function openSupplement()"""
new_advance = """    setSpeech(synthesisOverview);
    setPhase(PHASE.SYNTHESIS);
  }

  function continueToFollowup() {
    setSpeech(reflectionQuestion);
    setPhase(PHASE.FOLLOWUP);
  }

  function openSupplement()"""
t = replace_once(t, old_advance, new_advance, 'synthesis transition')

# First reading UI.
old_first = """        {phase === PHASE.FIRST_READING && (
          <View style={styles.tableSection}>
            <ReadingBlock card={drawCards[0]} index={0} interpretation={interpretation} />
            <Pressable style={styles.primaryButton} onPress={continueAfterFirstReading}>
              <Text style={styles.primaryButtonText}>我看完了，繼續</Text>
            </Pressable>
          </View>
        )}"""
new_first = """        {phase === PHASE.FIRST_READING && (
          <View style={styles.tableSection}>
            <ActiveReading card={drawCards[0]} index={0} interpretation={interpretation} />
            <Pressable style={styles.primaryButton} onPress={continueAfterFirstReading}>
              <Text style={styles.primaryButtonText}>我懂了，繼續</Text>
            </Pressable>
          </View>
        )}"""
t = replace_once(t, old_first, new_first, 'first reading UI')

# Login gate: no repeated full reading block; keep compact recap.
old_gate = """        {phase === PHASE.LOGIN_GATE && (
          <View style={styles.tableSection}>
            <ReadingBlock card={drawCards[0]} index={0} interpretation={interpretation} />
            <View style={styles.gateCard}>
              <Text style={styles.analysisTitle}>後面兩張會把關係串起來。</Text>
              <Pressable style={styles.primaryButton} onPress={unlockFullReading}>
                <Text style={styles.primaryButtonText}>登入並繼續</Text>
              </Pressable>
            </View>
          </View>
        )}"""
new_gate = """        {phase === PHASE.LOGIN_GATE && (
          <View style={styles.tableSection}>
            <ReadingRecap card={drawCards[0]} index={0} interpretation={interpretation} />
            <View style={styles.gateCard}>
              <Text style={styles.bodyCopy}>後面兩張會把這件事講完整。</Text>
              <Pressable style={styles.primaryButton} onPress={unlockFullReading}>
                <Text style={styles.primaryButtonText}>登入並繼續</Text>
              </Pressable>
            </View>
          </View>
        )}"""
t = replace_once(t, old_gate, new_gate, 'login gate UI')

# Full reading: previous cards collapse, only current card expanded, no giant synthesis here.
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
            <Pressable style={styles.primaryButton} onPress={advanceFullReading}>
              <Text style={styles.primaryButtonText}>{analysisCount < 3 ? '看下一張' : '我看完了，繼續'}</Text>
            </Pressable>
          </View>
        )}"""
new_full = """        {phase === PHASE.FULL_READING && (
          <View style={styles.tableSection}>
            {drawCards.slice(0, Math.max(0, analysisCount - 1)).map((card, index) => (
              <ReadingRecap key={card.id} card={card} index={index} interpretation={interpretation} />
            ))}
            <ActiveReading card={drawCards[analysisCount - 1]} index={analysisCount - 1} interpretation={interpretation} />
            <Pressable style={styles.primaryButton} onPress={advanceFullReading}>
              <Text style={styles.primaryButtonText}>{analysisCount < 3 ? '看下一張' : '三張一起看'}</Text>
            </Pressable>
          </View>
        )}

        {phase === PHASE.SYNTHESIS && (
          <View style={styles.tableSection}>
            <View style={styles.recapStack}>
              {drawCards.map((card, index) => (
                <ReadingRecap key={card.id} card={card} index={index} interpretation={interpretation} />
              ))}
            </View>
            <View style={styles.synthesisScene}>
              <Text style={styles.synthesisNarrative}>{synthesisNarrative}</Text>
              {(interpretation?.analysisSynthesis?.practicalGuidance || interpretation?.synthesis?.practicalGuidance || []).slice(0, 2).map((item) => (
                <View key={item} style={styles.synthesisStep}>
                  <Text style={styles.synthesisStepDot}>•</Text>
                  <Text style={styles.synthesisStepText}>{item}</Text>
                </View>
              ))}
            </View>
            <Pressable style={styles.primaryButton} onPress={continueToFollowup}>
              <Text style={styles.primaryButtonText}>我看完了</Text>
            </Pressable>
          </View>
        )}"""
t = replace_once(t, old_full, new_full, 'full + synthesis UI')

# Follow-up question is now exclusively in Vela speech bubble; remove duplicate card.
old_follow_head = """        {phase === PHASE.FOLLOWUP && (
          <View style={styles.tableSection}>
            <View style={styles.synthesisCard}>
              <Text style={styles.analysisTitle}>{reflectionQuestion}</Text>
            </View>
            {!followupAnswered && ("""
new_follow_head = """        {phase === PHASE.FOLLOWUP && (
          <View style={styles.tableSection}>
            {!followupAnswered && ("""
t = replace_once(t, old_follow_head, new_follow_head, 'follow-up duplicate question')

# Add game-result styles before analysisCard.
style_anchor = "  analysisCard: { marginTop: 14, borderRadius: 20, borderWidth: 1, borderColor: '#3C2A45', backgroundColor: '#18101F', padding: 18 },"
style_new = """  activeReading: { marginTop: 14, paddingVertical: 6 },
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
  analysisCard: { marginTop: 14, borderRadius: 20, borderWidth: 1, borderColor: '#3C2A45', backgroundColor: '#18101F', padding: 18 },"""
t = replace_once(t, style_anchor, style_new, 'game styles')

p.write_text(t)
