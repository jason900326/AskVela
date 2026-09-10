"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import VelaAccount from "./VelaAccount.js";
import VelaFlipPage from "./VelaFlipPage.js";

const CARD_BACK = "/images/vela/tarot-card-back.webp";
const ORIENTATION_LABELS = { upright: "正位", reversed: "逆位" };
const RANK_NUMBER = { ace: "01", two: "02", three: "03", four: "04", five: "05", six: "06", seven: "07", eight: "08", nine: "09", ten: "10", page: "11", knight: "12", queen: "13", king: "14" };
const SELECTION_POOL_SIZE = 12;
const CLARIFIER_POOL_SIZE = 6;
const WAITING_MIN_MS = 3000;
const WAITING_LINE_MS = 3200;
const WAITING_LINE_MIN_VISIBLE_MS = 3000;
const DEEP_WAITING_LINES = [
  "三張牌有一個地方，比單看其中任何一張都更明顯。",
  "其中兩張正在互相呼應，第三張可能剛好是轉折。",
  "我在分開『現在的壓力』和『真正需要處理的事』。",
  "有個拉扯藏在三個位置之間，我再對一下。",
  "先把表面的情緒放旁邊，看真正影響判斷的是什麼。",
  "我正在找：哪一張是在提醒你先別急著做決定。",
  "有些訊息單看不明顯，放回你的問題裡就變得很清楚。",
  "我再看一次，有沒有哪張牌其實在反駁第一眼的直覺。",
  "最後確認一下：哪些是牌面支持的，哪些還不能下結論。",
  "快好了，我把最值得你帶走的那一句留下來。",
];

function makeRequestId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `deep-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function tarotImagePath(card) {
  if (!card) return "";
  if (card.arcana === "major") {
    const filename = card.cardId
      .replace(/^major-/, "")
      .replace(/-fool$/, "-the-fool")
      .replace(/-magician$/, "-the-magician")
      .replace(/-high-priestess$/, "-the-high-priestess")
      .replace(/-empress$/, "-the-empress")
      .replace(/-emperor$/, "-the-emperor")
      .replace(/-hierophant$/, "-the-hierophant")
      .replace(/-lovers$/, "-the-lovers")
      .replace(/-chariot$/, "-the-chariot")
      .replace(/-hermit$/, "-the-hermit")
      .replace(/-hanged-man$/, "-the-hanged-man")
      .replace(/-devil$/, "-the-devil")
      .replace(/-tower$/, "-the-tower")
      .replace(/-star$/, "-the-star")
      .replace(/-moon$/, "-the-moon")
      .replace(/-sun$/, "-the-sun")
      .replace(/-world$/, "-the-world");
    return `/images/tarot/major/${filename}.webp`;
  }
  const rank = card.numberOrRank;
  if (!card.suit || !rank || !RANK_NUMBER[rank]) return "";
  return `/images/tarot/${card.suit}/${RANK_NUMBER[rank]}-${rank === "ace" ? "ace" : rank}-of-${card.suit}.webp`;
}

function cardWithDrawMetadata(card, draw, index) {
  const source = draw?.cards?.find((item) => item.cardId === card?.cardId)
    || draw?.cards?.[index]
    || {};
  return { ...source, ...card };
}

function initialReadingPayload(result) {
  return {
    overview: result?.synthesis?.overview || "",
    narrative: result?.synthesis?.narrative || "",
    cards: Array.isArray(result?.cards)
      ? result.cards.map((card) => ({
        cardId: card.cardId,
        contextInterpretation: card.contextInterpretation || "",
        practicalFocus: card.practicalFocus || "",
      }))
      : [],
  };
}

export default function VelaDeepReadingIntro({ onBack, initialQuestion = "", initialPlan = null }) {
  const interpretationPromiseRef = useRef(null);
  const waitingStartedAtRef = useRef(0);
  const [stage, setStage] = useState(() => initialPlan ? "clarify" : "intake");
  const [question, setQuestion] = useState(() => String(initialQuestion || "").slice(0, 700));
  const [plan, setPlan] = useState(() => initialPlan || null);
  const [selectedOptionId, setSelectedOptionId] = useState("");
  const [selectedIndexes, setSelectedIndexes] = useState([]);
  const [requestId, setRequestId] = useState("");
  const [draw, setDraw] = useState(null);
  const [result, setResult] = useState(null);
  const [revealedIndexes, setRevealedIndexes] = useState([]);
  const [waitingIndex, setWaitingIndex] = useState(0);
  const [walkthroughCount, setWalkthroughCount] = useState(1);
  const [showSynthesis, setShowSynthesis] = useState(false);
  const [followUpText, setFollowUpText] = useState("");
  const [followUps, setFollowUps] = useState([]);
  const [followUpResolution, setFollowUpResolution] = useState("idle");
  const [clarifier, setClarifier] = useState(null);
  const [loading, setLoading] = useState(false);
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [clarifierLoading, setClarifierLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedOption = useMemo(
    () => plan?.options?.find((option) => option.id === selectedOptionId) || null,
    [plan, selectedOptionId],
  );

  const activeReading = useMemo(() => {
    if (!draw || !result || !requestId || !selectedOption || !plan?.spreadId) return null;
    return {
      kind: "tarot",
      readingId: draw.readingId,
      requestId,
      question: selectedOption.readingQuestion,
      spreadId: plan.spreadId,
      selectedCardIndexes: selectedIndexes,
      draw,
      result,
      followUps,
    };
  }, [draw, followUps, plan, requestId, result, selectedIndexes, selectedOption]);

  useEffect(() => {
    if (stage !== "interpreting") return undefined;
    const timer = window.setInterval(() => {
      setWaitingIndex((current) => (current + 1) % DEEP_WAITING_LINES.length);
    }, WAITING_LINE_MS);
    return () => window.clearInterval(timer);
  }, [stage]);

  useEffect(() => {
    if (stage !== "interpreting" || !result) return undefined;
    const elapsed = Date.now() - waitingStartedAtRef.current;
    const minimumRemaining = Math.max(0, WAITING_MIN_MS - elapsed);
    const currentLineElapsed = elapsed % WAITING_LINE_MS;
    const currentLineNeeds = Math.max(0, WAITING_LINE_MIN_VISIBLE_MS - currentLineElapsed);
    const timer = window.setTimeout(
      () => setStage("result"),
      Math.max(minimumRemaining, currentLineNeeds),
    );
    return () => window.clearTimeout(timer);
  }, [result, stage]);

  async function submitIntake() {
    const text = question.trim();
    if (text.length < 8 || loading) {
      setError(text.length < 8 ? "再多說一點點，Vela 才能分辨你真正卡住的是哪一塊。" : "");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/deep-reading/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Vela 現在沒有整理好這個問題。");
      setPlan(data);
      setSelectedOptionId("");
      setStage("clarify");
    } catch (err) {
      setError(err.message || "Vela 現在沒有整理好這個問題。");
    } finally {
      setLoading(false);
    }
  }

  function chooseDirection(optionId) {
    setSelectedOptionId(optionId);
    setStage("plan");
  }

  function toggleCard(index) {
    if (loading) return;
    setSelectedIndexes((current) => {
      if (current.includes(index)) return current.filter((item) => item !== index);
      if (current.length >= 3) return current;
      return [...current, index];
    });
  }

  async function confirmThreeCards() {
    if (!selectedOption || selectedIndexes.length !== 3 || loading) return;
    const nextRequestId = makeRequestId();
    setRequestId(nextRequestId);
    setLoading(true);
    setError("");
    setWalkthroughCount(1);
    setShowSynthesis(false);
    setFollowUps([]);
    setFollowUpResolution("idle");
    setClarifier(null);

    try {
      const response = await fetch("/api/readings/draw", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": nextRequestId },
        body: JSON.stringify({
          question: selectedOption.readingQuestion,
          spreadId: plan.spreadId,
          requestId: nextRequestId,
          selectedCardIndexes: selectedIndexes,
        }),
      });
      const drawData = await response.json();
      if (!response.ok) throw new Error(drawData.error || "目前無法完成抽牌。");

      setDraw(drawData);
      setRevealedIndexes([]);
      setStage("reveal");

      interpretationPromiseRef.current = (async () => {
        const interpretationResponse = await fetch("/api/readings/interpret", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Idempotency-Key": nextRequestId },
          body: JSON.stringify({
            question: selectedOption.readingQuestion,
            spreadId: plan.spreadId,
            requestId: nextRequestId,
            readingId: drawData.readingId,
            selectedCardIndexes: selectedIndexes,
          }),
        });
        const interpretation = await interpretationResponse.json();
        if (!interpretationResponse.ok) throw new Error(interpretation.error || "目前無法完成解讀。");
        setResult(interpretation);
        return interpretation;
      })().catch((err) => {
        setError(err.message || "目前無法完成解讀。");
        return null;
      });
    } catch (err) {
      setError(err.message || "目前無法完成抽牌。");
    } finally {
      setLoading(false);
    }
  }

  function revealCard(index) {
    if (!draw || revealedIndexes.includes(index)) return;
    setRevealedIndexes((current) => [...current, index]);
  }

  function beginInterpretation() {
    if (!draw || revealedIndexes.length !== draw.cards.length) return;
    waitingStartedAtRef.current = Date.now();
    setWaitingIndex(Math.floor(Math.random() * DEEP_WAITING_LINES.length));
    setStage("interpreting");
  }

  function advanceWalkthrough() {
    if (walkthroughCount < 3) {
      setWalkthroughCount((current) => Math.min(3, current + 1));
      return;
    }
    setShowSynthesis(true);
  }

  async function submitFollowUp() {
    const message = followUpText.trim();
    if (!message || !draw || !result || !selectedOption || followUpLoading) return;
    setFollowUpLoading(true);
    setError("");
    setFollowUpResolution("idle");

    try {
      const response = await fetch("/api/readings/follow-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          readingId: draw.readingId,
          requestId,
          question: selectedOption.readingQuestion,
          spreadId: plan.spreadId,
          selectedCardIndexes: selectedIndexes,
          message,
          history: followUps.map((item) => ({ question: item.question, answer: item.answer })),
          initialReading: initialReadingPayload(result),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "目前無法完成這次追問。");
      setFollowUps((current) => [...current, { question: message, answer: data.answer, practicalFocus: data.practicalFocus || "" }]);
      setFollowUpText("");
    } catch (err) {
      setError(err.message || "目前無法完成這次追問。");
    } finally {
      setFollowUpLoading(false);
    }
  }

  async function drawClarifier(slot) {
    if (!draw || !result || !selectedOption || clarifierLoading || clarifier) return;
    setClarifierLoading(true);
    setError("");
    try {
      const response = await fetch("/api/readings/clarifier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          readingId: draw.readingId,
          requestId,
          question: selectedOption.readingQuestion,
          spreadId: plan.spreadId,
          selectedCardIndexes: selectedIndexes,
          clarifierCount: 0,
          clarifierSlots: [slot],
          initialReading: initialReadingPayload(result),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "目前無法補這張牌。");
      setClarifier(data);
      setFollowUpResolution("resolved");
    } catch (err) {
      setError(err.message || "目前無法補這張牌。");
    } finally {
      setClarifierLoading(false);
    }
  }

  const total = 7;

  return (
    <section className={`deepReadingPrototype deep-stage-${stage}`}>
      <VelaAccount activeReading={activeReading} experience="tarot" />
      <button className="deepBackButton" type="button" onClick={onBack}>← 回到首頁</button>

      <div className="deepReadingShell">
        <div className="deepReadingEyebrow">✦ VELA+ · DEEP READING</div>

        {stage === "intake" && (
          <VelaFlipPage pageKey="deep-intake" step={1} total={total} label="先把事情說給我聽">
            <div className="deepReadingStep velaFlipContentCard deepIntakeCard">
              <h1>最近有哪件事，你一直想不明白？</h1>
              <p>不用整理成漂亮的問題。把你現在知道的、在意的、猶豫的都說出來就好。</p>
              <textarea
                rows={7}
                maxLength={700}
                value={question}
                onChange={(event) => {
                  setQuestion(event.target.value);
                  if (error) setError("");
                }}
                placeholder="例如：我們最近越來越少說話。我不知道是我太敏感，還是這段關係真的變了；我也不知道自己還要不要繼續投入。"
              />
              <div className="deepReadingActions">
                <span>{question.length}/700</span>
                <button className="primaryButton" type="button" disabled={loading} onClick={submitIntake}>
                  {loading ? "Vela 正在整理…" : "讓 Vela 先聽懂"}
                </button>
              </div>
            </div>
          </VelaFlipPage>
        )}

        {stage === "clarify" && plan && (
          <VelaFlipPage pageKey="deep-clarify" step={2} total={total} label="先釐清真正想看的地方">
            <div className="deepReadingStep velaFlipContentCard deepClarifyCard">
              <div className="deepVelaLine">{plan.velaLine}</div>
              <h2>{plan.clarifyingQuestion}</h2>
              <div className="deepDynamicChoices">
                {plan.options.map((option) => (
                  <button type="button" key={option.id} onClick={() => chooseDirection(option.id)}>
                    <strong>{option.label}</strong>
                    <span>{option.focusQuestion}</span>
                  </button>
                ))}
              </div>
              <button className="deepTextBack" type="button" onClick={() => setStage("intake")}>我想補充原本的描述</button>
            </div>
          </VelaFlipPage>
        )}

        {stage === "plan" && selectedOption && (
          <VelaFlipPage pageKey="deep-plan" step={3} total={total} label="Vela 決定怎麼看這件事">
            <div className="deepReadingStep velaFlipContentCard deepPlanCard">
              <span className="deepIssueTitle">{plan.readingTitle}</span>
              <h1>{selectedOption.focusQuestion}</h1>
              <p>這次我想從三個地方看，不需要你先選牌陣。</p>
              <div className="deepLensList">
                {selectedOption.lenses.map((lens, index) => (
                  <article key={`${lens.label}-${index}`}>
                    <span>0{index + 1}</span>
                    <div><strong>{lens.label}</strong><p>{lens.purpose}</p></div>
                  </article>
                ))}
              </div>
              <div className="deepReadingActions">
                <button className="ghostButton" type="button" onClick={() => setStage("clarify")}>換一個方向</button>
                <button className="primaryButton" type="button" onClick={() => setStage("select")}>開始抽牌</button>
              </div>
            </div>
          </VelaFlipPage>
        )}

        {stage === "select" && selectedOption && (
          <VelaFlipPage pageKey="deep-select" step={4} total={total} label="選三張牌">
            <div className="deepReadingStep velaFlipContentCard deepSelectCard">
              <h1>選三張。</h1>
              <p>依序會放進剛才的三個位置。選錯可以再點一次取消，確定後才會真正抽牌。</p>
              <div className="deepSelectionProgress">
                {selectedOption.lenses.map((lens, index) => (
                  <span key={lens.label} className={selectedIndexes[index] !== undefined ? "isReady" : ""}>{index + 1}. {lens.label}</span>
                ))}
              </div>
              <div className="deepCardPool" aria-label="Deep Reading 選牌區">
                {Array.from({ length: SELECTION_POOL_SIZE }, (_, index) => {
                  const order = selectedIndexes.indexOf(index);
                  return (
                    <button type="button" key={index} className={order >= 0 ? "isSelected" : ""} onClick={() => toggleCard(index)} aria-label={`第 ${index + 1} 張牌`}>
                      <img src={CARD_BACK} alt="" draggable="false" />
                      {order >= 0 && <b>{order + 1}</b>}
                    </button>
                  );
                })}
              </div>
              <div className="deepReadingActions">
                <span>已選 {selectedIndexes.length}/3</span>
                <button className="primaryButton" type="button" disabled={selectedIndexes.length !== 3 || loading} onClick={confirmThreeCards}>
                  {loading ? "正在放好牌面…" : "就這三張"}
                </button>
              </div>
            </div>
          </VelaFlipPage>
        )}

        {stage === "reveal" && draw && selectedOption && (
          <VelaFlipPage pageKey="deep-reveal" step={5} total={total} label="看看你抽到了什麼">
            <div className="deepReadingStep velaFlipContentCard deepRevealCard">
              <div className="deepVelaLine">直接點牌翻開。三張都看清楚後，我們再往下。</div>
              <div className="deepRevealRow">
                {draw.cards.map((card, index) => {
                  const revealed = revealedIndexes.includes(index);
                  const lens = selectedOption.lenses[index];
                  return (
                    <article key={card.cardId} className={revealed ? "isRevealed" : ""}>
                      <span>{lens.label}</span>
                      <button
                        type="button"
                        className={`deepRevealTap ${revealed ? "isRevealed" : ""}`}
                        onClick={() => revealCard(index)}
                        aria-label={revealed ? `${card.nameZhTw}，已翻開` : `翻開「${lens.label}」`}
                      >
                        <div className="deepRevealFlip">
                          <div className="deepRevealFlipInner">
                            <div className="deepRevealFace deepRevealBack">
                              <img src={CARD_BACK} alt="" draggable="false" />
                            </div>
                            <div className={`deepRevealFace deepRevealFront ${card.orientation === "reversed" ? "isReversed" : ""}`}>
                              <img src={tarotImagePath(card)} alt={card.nameZhTw} draggable="false" />
                            </div>
                          </div>
                        </div>
                      </button>
                      <strong>{revealed ? card.nameZhTw : "點牌翻開"}</strong>
                      {revealed && <small>{ORIENTATION_LABELS[card.orientation] || card.orientation}</small>}
                    </article>
                  );
                })}
              </div>
              {revealedIndexes.length === draw.cards.length && (
                <button className="primaryButton deepRevealContinue" type="button" onClick={beginInterpretation}>
                  讓 Vela 把三張牌放在一起看
                </button>
              )}
            </div>
          </VelaFlipPage>
        )}

        {stage === "interpreting" && selectedOption && (
          <VelaFlipPage pageKey="deep-interpreting" step={6} total={total} label="整理這次 Reading">
            <div className="deepReadingStep velaFlipContentCard deepWaitingCard">
              <div className="deepWaitingOrb" aria-hidden="true"><i /><i /><i /></div>
              <p key={waitingIndex} className="deepWaitingLine" aria-live="polite">{DEEP_WAITING_LINES[waitingIndex]}</p>
            </div>
          </VelaFlipPage>
        )}

        {stage === "result" && result && selectedOption && (
          <VelaFlipPage pageKey="deep-result" step={7} total={total} label="把這件事看完整">
            <article className="deepReadingResult velaFlipContentCard">
              <header>
                <span>{plan.readingTitle}</span>
                <h1>{selectedOption.focusQuestion}</h1>
                {!showSynthesis && <p>我先一個位置一個位置說。前一張看清楚之後，再把下一張接上來。</p>}
              </header>

              <section className="deepCardWalkthrough">
                {result.cards.slice(0, walkthroughCount).map((card, index) => {
                  const lens = selectedOption.lenses[index];
                  const artCard = cardWithDrawMetadata(card, draw, index);
                  return (
                    <article key={card.cardId} className="deepWalkthroughCard">
                      <div className={`deepResultCardImage ${card.orientation === "reversed" ? "isReversed" : ""}`}>
                        <img src={tarotImagePath(artCard)} alt={card.nameZhTw} draggable="false" />
                      </div>
                      <div>
                        <span>{lens.label}</span>
                        <h2>{card.nameZhTw} · {ORIENTATION_LABELS[card.orientation] || card.orientation}</h2>
                        <p>{card.contextInterpretation}</p>
                        {card.practicalFocus && <small>{card.practicalFocus}</small>}
                      </div>
                    </article>
                  );
                })}
              </section>

              {!showSynthesis && (
                <div className="deepWalkthroughAdvance">
                  <span>{walkthroughCount < 3 ? `${walkthroughCount}/3 個位置已看` : "三個位置都看過了"}</span>
                  <button className="primaryButton" type="button" onClick={advanceWalkthrough}>
                    {walkthroughCount < 3 ? `接著看「${selectedOption.lenses[walkthroughCount].label}」` : "把三張牌放在一起看"}
                  </button>
                </div>
              )}

              {showSynthesis && (
                <>
                  <section className="deepSynthesis deepSynthesisReveal">
                    <div className="deepVerdict">
                      <span>VELA 的結論</span>
                      <h2>{result.synthesis?.overview || "這三張牌的重點，已經比單看其中一張更清楚了。"}</h2>
                    </div>

                    {result.synthesis?.crossCardPattern && (
                      <div className="deepTurningPoint">
                        <span>真正值得注意的是</span>
                        <p>{result.synthesis.crossCardPattern}</p>
                      </div>
                    )}

                    {Array.isArray(result.synthesis?.practicalGuidance) && result.synthesis.practicalGuidance.length > 0 && (
                      <div className="deepGuidanceBlock">
                        <span>接下來看這幾件事</span>
                        <div className="deepGuidanceList">
                          {result.synthesis.practicalGuidance.map((item) => <span key={item}>{item}</span>)}
                        </div>
                      </div>
                    )}

                    {result.synthesis?.narrative && (
                      <details className="deepSynthesisReasoning">
                        <summary>為什麼我會這樣看？</summary>
                        <p>{result.synthesis.narrative}</p>
                      </details>
                    )}
                  </section>

                  <section className="deepContinuation">
                    <h2>這裡有哪一點，你還想跟我繼續看？</h2>
                    <p>沿用這三張牌，不會因為追問就重抽。</p>
                    {followUps.map((item, index) => (
                      <article className="deepFollowUpExchange" key={`${item.question}-${index}`}>
                        <strong>你：{item.question}</strong>
                        <p>{item.answer}</p>
                        {item.practicalFocus && <small>{item.practicalFocus}</small>}
                      </article>
                    ))}
                    {followUps.length < 6 && (
                      <div className="deepFollowUpComposer">
                        <textarea rows={3} maxLength={320} value={followUpText} onChange={(event) => setFollowUpText(event.target.value)} placeholder="例如：你剛剛說要看實際互動，那我現在最該觀察的是什麼？" />
                        <button className="primaryButton" type="button" disabled={!followUpText.trim() || followUpLoading} onClick={submitFollowUp}>
                          {followUpLoading ? "Vela 正在接著看…" : "繼續聊這件事"}
                        </button>
                      </div>
                    )}

                    {followUps.length > 0 && !clarifier && followUpResolution === "idle" && (
                      <div className="deepResolutionCheck">
                        <span>剛才這段有比較清楚嗎？</span>
                        <div>
                          <button type="button" onClick={() => setFollowUpResolution("resolved")}>有，先到這裡</button>
                          <button type="button" onClick={() => setFollowUpResolution("stuck")}>還卡著</button>
                        </div>
                      </div>
                    )}

                    {followUpResolution === "stuck" && !clarifier && (
                      <div className="deepClarifierOffer">
                        <h3>那這一點可以補一張。</h3>
                        <p>這張只用來釐清剛才沒解開的地方，不會推翻前面的三張牌。選一張就好。</p>
                        <div className="deepClarifierPool">
                          {Array.from({ length: CLARIFIER_POOL_SIZE }, (_, index) => (
                            <button type="button" key={index} disabled={clarifierLoading} onClick={() => drawClarifier(index)} aria-label={`補充牌第 ${index + 1} 張`}>
                              <img src={CARD_BACK} alt="" draggable="false" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {clarifier && (
                      <article className="deepClarifierResult">
                        <div className={`deepResultCardImage ${clarifier.card.orientation === "reversed" ? "isReversed" : ""}`}>
                          <img src={tarotImagePath(clarifier.card)} alt={clarifier.card.nameZhTw} draggable="false" />
                        </div>
                        <div>
                          <span>補充牌</span>
                          <h3>{clarifier.card.nameZhTw} · {ORIENTATION_LABELS[clarifier.card.orientation] || clarifier.card.orientation}</h3>
                          <p>{clarifier.interpretation}</p>
                          {clarifier.practicalFocus && <small>{clarifier.practicalFocus}</small>}
                        </div>
                      </article>
                    )}
                  </section>
                </>
              )}
            </article>
          </VelaFlipPage>
        )}

        {error && <div className="phase12EntryError deepReadingError" role="alert">{error}</div>}
      </div>
    </section>
  );
}
