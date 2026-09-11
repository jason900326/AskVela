from pathlib import Path
import re

p = Path('mobile/App.js')
s = p.read_text()

def once(old,new,label):
    global s
    if s.count(old)!=1:
        raise SystemExit(f'{label}: expected 1 got {s.count(old)}')
    s=s.replace(old,new,1)

# Add speaker label inside the stage bubble.
once("""      <View style={styles.speechBubble}>
        <Text style={styles.speech}>{speech}</Text>
      </View>""","""      <View style={styles.speechBubble}>
        <Text style={styles.speakerTag}>VELA</Text>
        <Text style={styles.speech}>{speech}</Text>
      </View>""",'speaker tag')

# Add stage card strip component after MiniCard.
marker = """function getGameReading(resultCard, card, index) {"""
insert = """function ReadingCardStrip({ cards, activeIndex = -1 }) {
  return (
    <View style={styles.readingStrip}>
      {cards.map((card, index) => (
        <View key={card.id} style={[styles.readingStripCard, index === activeIndex && styles.readingStripCardActive]}>
          <Text style={[styles.readingStripName, index === activeIndex && styles.readingStripNameActive]}>{card.name}</Text>
          <Text style={styles.readingStripOrientation}>{card.reversed ? '逆位' : '正位'}</Text>
        </View>
      ))}
    </View>
  );
}

function getGameReading(resultCard, card, index) {"""
once(marker, insert, 'reading strip component')

# Helper dialogue from reading data.
marker2 = """function ActiveReading({ card, index, interpretation }) {"""
insert2 = """function buildReadingDialogue(resultCard, card, index) {
  const game = getGameReading(resultCard, card, index);
  return [
    game.coreJudgment,
    game.briefReason && game.briefReason !== game.coreJudgment ? game.briefReason : '',
    game.practicalFocus ? `你可以先：${game.practicalFocus}` : '',
  ].filter(Boolean).join('\\n');
}

function ActiveReading({ card, index, interpretation }) {"""
once(marker2, insert2, 'dialogue helper')

# Stage speech now owns the reading, synthesis, followup response, supplement interpretation.
old_stage = """  const stageSpeech = phase === PHASE.CURTAIN
    ? PREPARE_LINES[prepareIndex]
    : phase === PHASE.THINKING
      ? THINKING_LINES[thinkingIndex]
      : activeGameReading?.coreJudgment || speech;

  const synthesisOverview = interpretation?.analysisSynthesis?.overview || '三張牌放在一起';
  const synthesisNarrative = interpretation?.analysisSynthesis?.narrative
    || '第一張描述你現在的位置，第二張指出真正的阻力，第三張則把下一步縮小到一個比較能處理的方向。';"""
new_stage = """  const synthesisOverview = interpretation?.analysisSynthesis?.overview || '三張牌放在一起';
  const synthesisNarrative = interpretation?.analysisSynthesis?.narrative
    || '第一張描述你現在的位置，第二張指出真正的阻力，第三張則把下一步縮小到一個比較能處理的方向。';

  const readingDialogue = activeReadingIndex === null
    ? ''
    : buildReadingDialogue(activeResultCard, activeDrawCard, activeReadingIndex);

  const stageSpeech = phase === PHASE.CURTAIN
    ? PREPARE_LINES[prepareIndex]
    : phase === PHASE.THINKING
      ? THINKING_LINES[thinkingIndex]
      : phase === PHASE.SYNTHESIS
        ? [synthesisOverview, synthesisNarrative].filter(Boolean).join('\\n')
        : phase === PHASE.FOLLOWUP && followupAnswered
          ? (followupLoading ? '……' : followupAnswer || speech)
          : phase === PHASE.SUPPLEMENT && supplementRevealed
            ? '這張沒有推翻前面三張。它只是把焦點縮小：先處理你能控制的部分，比一直猜結果更有用。'
            : readingDialogue || speech;"""
once(old_stage,new_stage,'stage speech ownership')

# FIRST_READING: no report below, just cards + control.
old = """        {phase === PHASE.FIRST_READING && (
          <View style={styles.tableSection}>
            <ActiveReading card={drawCards[0]} index={0} interpretation={interpretation} />
            <Pressable style={styles.primaryButton} onPress={continueAfterFirstReading}>
              <Text style={styles.primaryButtonText}>我懂了，繼續</Text>
            </Pressable>
          </View>
        )}"""
new = """        {phase === PHASE.FIRST_READING && (
          <View style={styles.tableSection}>
            <ReadingCardStrip cards={drawCards} activeIndex={0} />
            <Pressable style={styles.primaryButton} onPress={continueAfterFirstReading}>
              <Text style={styles.primaryButtonText}>繼續聽 Vela 說</Text>
            </Pressable>
          </View>
        )}"""
once(old,new,'first reading scene')

# LOGIN gate: no recap/body duplication.
old = """        {phase === PHASE.LOGIN_GATE && (
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
new = """        {phase === PHASE.LOGIN_GATE && (
          <View style={styles.tableSection}>
            <ReadingCardStrip cards={drawCards} activeIndex={0} />
            <Pressable style={styles.primaryButton} onPress={unlockFullReading}>
              <Text style={styles.primaryButtonText}>登入並繼續</Text>
            </Pressable>
          </View>
        )}"""
once(old,new,'login gate scene')

# FULL READING: stage speaks; bottom only cards + control.
old = """        {phase === PHASE.FULL_READING && (
          <View style={styles.tableSection}>
            {drawCards.slice(0, Math.max(0, analysisCount - 1)).map((card, index) => (
              <ReadingRecap key={card.id} card={card} index={index} interpretation={interpretation} />
            ))}
            <ActiveReading card={drawCards[analysisCount - 1]} index={analysisCount - 1} interpretation={interpretation} />
            <Pressable style={styles.primaryButton} onPress={advanceFullReading}>
              <Text style={styles.primaryButtonText}>{analysisCount < 3 ? '看下一張' : '三張一起看'}</Text>
            </Pressable>
          </View>
        )}"""
new = """        {phase === PHASE.FULL_READING && (
          <View style={styles.tableSection}>
            <ReadingCardStrip cards={drawCards} activeIndex={analysisCount - 1} />
            <Pressable style={styles.primaryButton} onPress={advanceFullReading}>
              <Text style={styles.primaryButtonText}>{analysisCount < 3 ? '繼續聽下一張' : '把三張串起來'}</Text>
            </Pressable>
          </View>
        )}"""
once(old,new,'full reading scene')

# SYNTHESIS: remove report; three cards + continue only.
old = """        {phase === PHASE.SYNTHESIS && (
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
new = """        {phase === PHASE.SYNTHESIS && (
          <View style={styles.tableSection}>
            <ReadingCardStrip cards={drawCards} activeIndex={-1} />
            <Pressable style={styles.primaryButton} onPress={continueToFollowup}>
              <Text style={styles.primaryButtonText}>繼續</Text>
            </Pressable>
          </View>
        )}"""
once(old,new,'synthesis scene')

# FOLLOWUP answered: keep interaction only; Vela response is on stage.
old = """            {followupAnswered && (
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
            )}"""
new = """            {followupAnswered && (
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
            )}"""
once(old,new,'followup scene')

# SUPPLEMENT: no repeated Vela response or report below.
old = """        {phase === PHASE.SUPPLEMENT && supplementCard && (
          <View style={styles.tableSection}>
            {!!followupAnswer && (
              <Text style={styles.velaReply}>{followupAnswer}</Text>
            )}
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
              <View style={styles.synthesisCard}>
                <Text style={styles.analysisTitle}>{supplementCard.name} · {supplementCard.reversed ? '逆位' : '正位'}</Text>
                <Text style={styles.bodyCopy}>這張沒有推翻前面三張，它只是把焦點縮小：你接下來先處理自己能控制的部分，比一直猜結果更有用。</Text>
                <Pressable style={styles.primaryButton} onPress={resetReading}>
                  <Text style={styles.primaryButtonText}>今天先到這裡</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}"""
new = """        {phase === PHASE.SUPPLEMENT && supplementCard && (
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
              <Pressable style={styles.primaryButton} onPress={resetReading}>
                <Text style={styles.primaryButtonText}>今天先到這裡</Text>
              </Pressable>
            )}
          </View>
        )}"""
once(old,new,'supplement scene')

# Stage styling: dialogue anchored inside stage like a visual novel.
once("""  stage: { minHeight: 330, borderRadius: 28, borderWidth: 1, borderColor: '#3B2550', backgroundColor: '#1A1025', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: 20 },""","""  stage: { minHeight: 420, borderRadius: 28, borderWidth: 1, borderColor: '#3B2550', backgroundColor: '#1A1025', alignItems: 'center', justifyContent: 'flex-start', overflow: 'hidden', padding: 20, paddingBottom: 128 },""",'stage style')
once("""  velaPlaceholder: { width: 150, height: 190, borderTopLeftRadius: 74, borderTopRightRadius: 74, borderBottomLeftRadius: 34, borderBottomRightRadius: 34, backgroundColor: '#2B1D36', borderWidth: 1, borderColor: '#594064', alignItems: 'center', justifyContent: 'center' },""","""  velaPlaceholder: { marginTop: 26, width: 200, height: 235, borderTopLeftRadius: 96, borderTopRightRadius: 96, borderBottomLeftRadius: 38, borderBottomRightRadius: 38, backgroundColor: '#2B1D36', borderWidth: 1, borderColor: '#594064', alignItems: 'center', justifyContent: 'center' },""",'placeholder style')
once("""  speechBubble: { marginTop: 22, width: '100%', borderRadius: 18, backgroundColor: '#F0E4F4', paddingHorizontal: 16, paddingVertical: 14 },
  speech: { color: '#25182C', fontSize: 16, lineHeight: 23, textAlign: 'center', fontWeight: '600' },""","""  speechBubble: { position: 'absolute', left: 16, right: 16, bottom: 16, minHeight: 92, borderRadius: 18, backgroundColor: '#F0E4F4', paddingHorizontal: 16, paddingTop: 18, paddingBottom: 14 },
  speakerTag: { position: 'absolute', top: -10, left: 14, borderRadius: 8, backgroundColor: '#5C356B', color: '#FFF5FF', paddingHorizontal: 9, paddingVertical: 4, fontSize: 9, fontWeight: '800', letterSpacing: 1.2, overflow: 'hidden' },
  speech: { color: '#25182C', fontSize: 15, lineHeight: 22, textAlign: 'left', fontWeight: '600' },""",'speech style')

# Add strip styles before thinkingSection.
style_marker = """  thinkingSection: { marginTop: 20, alignItems: 'center' },"""
style_insert = """  readingStrip: { width: '100%', flexDirection: 'row', gap: 10 },
  readingStripCard: { flex: 1, minHeight: 132, borderRadius: 14, borderWidth: 1, borderColor: '#5E416A', backgroundColor: '#24142F', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  readingStripCardActive: { borderWidth: 2, borderColor: '#C99BDB', backgroundColor: '#35203F', transform: [{ translateY: -4 }] },
  readingStripName: { color: '#BBA9C1', fontSize: 14, fontWeight: '800', textAlign: 'center' },
  readingStripNameActive: { color: '#FFF5FF' },
  readingStripOrientation: { marginTop: 7, color: '#AE8CBA', fontSize: 11 },
  thinkingSection: { marginTop: 20, alignItems: 'center' },"""
once(style_marker, style_insert, 'strip styles')

p.write_text(s)
