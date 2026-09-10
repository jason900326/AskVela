"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import VelaAccount from "./VelaAccount.js";
import VelaFlipPage from "./VelaFlipPage.js";

const CARD_BACK = "/images/vela/tarot-card-back.webp";
const ORIENTATION_LABELS = { upright: "正位", reversed: "逆位" };
const RANK_NUMBER = { ace: "01", two: "02", three: "03", four: "04", five: "05", six: "06", seven: "07", eight: "08", nine: "09", ten: "10", page: "11", knight: "12", queen: "13", king: "14" };
const CLARIFIER_POOL_SIZE = 6;
const WAITING_MIN_MS = 3000;
const WAITING_LINE_MS = 3200;
const WAITING_LINE_MIN_VISIBLE_MS = 3000;
const DEEP_WAITING_LINES = [
  "第二張和第一張之間，已經開始出現一個關係。",
  "第三張補進來後，有些原本模糊的地方會突然變清楚。",
  "我在看哪兩張互相支持，哪一張其實在拉住前面的方向。",
  "先不重複剛才第一張說過的，我只找新增的訊息。",
  "三個位置放在一起後，真正的重點通常不是牌義本身。",
  "我再確認一下，這三張牌共同指向的是選擇、界線，還是時機。",
  "有一個轉折只有把三張一起看才會出現。",
  "我在把能確定的部分和還不能下結論的地方分開。",
  "最後再對一次：哪一句才是你現在最值得帶走的。",
  "快好了，我把三張牌收斂成一個清楚的判斷。",
];

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

export default function VelaDeepTrialReading({ seed, onBack, onOpenPlans }) {
  const interpretationPromiseRef = useRef(null);
  const waitingStartedAtRef = useRef(0);
  const [stage, setStage] = useState("reveal");
  const [result, setResult] = useState(null);
  const [revealedIndexes, setRevealedIndexes] = useState(() => {
    const persisted = Array.isArray(seed?.revealedIndexes)
      ? seed.revealedIndexes.filter((index) => Number.isInteger(index) && index >= 0 && index < 3)
      : [];
    return persisted.length > 0 ? Array.from(new Set(persisted)).sort((a, b) => a - b) : [0];
  });
  const [waitingIndex, setWaitingIndex] = useState(0);
  const [walkthroughCount, setWalkthroughCount] = useState(2);
  const [showSynthesis, setShowSynthesis] = useState(false);
  const [followUpText, setFollowUpText] = useState("");
  const [followUps, setFollowUps] = useState([]);
  const [followUpResolution, setFollowUpResolution] = useState("idle");
  const [clarifier, setClarifier] = useState(null);
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [clarifierLoading, setClarifierLoading] = useState(false);
  const [error, setError] = useState("");

  const plan = seed?.plan || null;
  const draw = seed?.draw || null;
  const requestId = seed?.requestId || "";
  const selectedIndexes = Array.isArray(seed?.selectedIndexes) ? seed.selectedIndexes : [];
  const selectedOption = useMemo(
    () => plan?.options?.find((option) => option.id === seed?.selectedOptionId) || plan?.options?.[0] || null,
    [plan, seed?.selectedOptionId],
  );
  const readingQuestion = seed?.readingQuestion || selectedOption?.readingQuestion || seed?.question || "";
  const allCardsAlreadyRevealed = Boolean(draw?.cards?.length) && revealedIndexes.length === draw.cards.length;

  const activeReading = useMemo(() => {
    if (!draw || !result || !requestId || !selectedOption || !plan?.spreadId) return null;
    return {
      kind: "tarot",
      readingId: draw.readingId,
      requestId,
      question: readingQuestion,
      spreadId: plan.spreadId,
      selectedCardIndexes: selectedIndexes,
      draw,
      result,
      followUps,
    };
  }, [draw, followUps, plan, readingQuestion, requestId, result, selectedIndexes, selectedOption]);

  useEffect(() => {
    if (!draw || !selectedOption || !plan?.spreadId || selectedIndexes.length !== 3 || !requestId) return undefined;
    if (interpretationPromiseRef.current) return undefined;

    const promise = (async () => {
      const response = await fetch("/api/readings/interpret", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": requestId },
        body: JSON.stringify({
          question: readingQuestion,
          spreadId: plan.spreadId,
          requestId,
          readingId: draw.readingId,
          selectedCardIndexes: selectedIndexes,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "目前無法完成完整解讀。");
      setResult(data);
      return data;
    })().catch((err) => {
      setError(err.message || "目前無法完成完整解讀。");
      return null;
    });

    interpretationPromiseRef.current = promise;
    return undefined;
  }, [draw, plan, readingQuestion, requestId, selectedIndexes, selectedOption]);

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
    const timer = window.setTimeout(() => setStage("result"), Math.max(minimumRemaining, currentLineNeeds));
    return () => window.clearTimeout(timer);
  }, [result, stage]);

  function revealCard(index) {
    if (!draw || index === 0 || revealedIndexes.includes(index)) return;
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
      setWalkthroughCount(3);
      return;
    }
    setShowSynthesis(true);
  }

  async function submitFollowUp() {
    const message = followUpText.trim();
    if (!message || !draw || !result || !selectedOption || followUpLoading || followUps.length >= 1) return;
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
          question: readingQuestion,
          spreadId: plan.spreadId,
          selectedCardIndexes: selectedIndexes,
          message,
          history: [],
          initialReading: initialReadingPayload(result),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "目前無法完成這次追問。");
      setFollowUps([{ question: message, answer: data.answer, practicalFocus: data.practicalFocus || "" }]);
      setFollowUpText("");
    } catch (err) {
      setError(err.message || "目前無法完成這次追問。");
    } finally {
      setFollowUpLoading(false);
    }
  }

  async function drawClarifier(slot) {
    if (!draw || !result || !selectedOption || clarifierLoading || clarifier || followUps.length === 0) return;
    setClarifierLoading(true);
    setError("");
    try {
      const response = await fetch("/api/readings/clarifier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          readingId: draw.readingId,
          requestId,
          question: readingQuestion,
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

  if (!draw || draw.cards?.length !== 3 || !selectedOption || !plan?.spreadId) {
    return (
      <section className="deepReadingPrototype">
        <VelaAccount experience="tarot" />
        <div className="deepReadingShell"><div className="phase12EntryError deepReadingError">這次免費體驗的牌面沒有完整保留下來，請重新開始。</div></div>
      </section>
    );
  }

  return (
    <section className={`deepReadingPrototype deepTrialReading deep-stage-${stage}`}>
      <VelaAccount activeReading={activeReading} experience="tarot" />
      <button className="deepBackButton" type="button" onClick={onBack}>← 回到首頁</button>

      <div className="deepReadingShell">
        <div className="deepReadingEyebrow">✦ 免費體驗 · DEEP READING</div>

        {stage === "reveal" && (
          <VelaFlipPage pageKey="deep-trial-reveal" step={5} total={7} label="開始深度解析">
            <div className="deepReadingStep velaFlipContentCard deepRevealCard">
              <div className="deepVelaLine">
                {allCardsAlreadyRevealed
                  ? "三張牌剛才都已經翻開了。牌面不變，現在直接把三個位置放在一起看。"
                  : "第一張剛才已經看過了。把還沒翻開的牌補完，不需要重新抽牌。"}
              </div>
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
                        disabled={index === 0 || revealed}
                        aria-label={revealed ? `${card.nameZhTw}，已翻開` : `翻開「${lens.label}」`}
                      >
                        <div className="deepRevealFlip">
                          <div className="deepRevealFlipInner">
                            <div className="deepRevealFace deepRevealBack">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={CARD_BACK} alt="" draggable="false" />
                            </div>
                            <div className={`deepRevealFace deepRevealFront ${card.orientation === "reversed" ? "isReversed" : ""}`}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={tarotImagePath(card)} alt={card.nameZhTw} draggable="false" />
                            </div>
                          </div>
                        </div>
                      </button>
                      <strong>{revealed ? card.nameZhTw : "點牌翻開"}</strong>
                      {revealed && <small>{ORIENTATION_LABELS[card.orientation] || card.orientation}{index === 0 ? " · 免費解析已看" : ""}</small>}
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

        {stage === "interpreting" && (
          <VelaFlipPage pageKey="deep-trial-interpreting" step={6} total={7} label="整理這次 Reading">
            <div className="deepReadingStep velaFlipContentCard deepWaitingCard">
              <div className="deepWaitingOrb" aria-hidden="true"><i /><i /><i /></div>
              <p key={waitingIndex} className="deepWaitingLine" aria-live="polite">{DEEP_WAITING_LINES[waitingIndex]}</p>
            </div>
          </VelaFlipPage>
        )}

        {stage === "result" && result && (
          <VelaFlipPage pageKey="deep-trial-result" step={7} total={7} label="把這件事看完整">
            <article className="deepReadingResult velaFlipContentCard">
              <header>
                <span>{plan.readingTitle}</span>
                <h1>{selectedOption.focusQuestion}</h1>
                {!showSynthesis && <p>第一張剛才已經完整看過。現在只把另外兩個位置接上來。</p>}
              </header>

              <section className="deepCardWalkthrough">
                {result.cards.slice(1, walkthroughCount).map((card, relativeIndex) => {
                  const index = relativeIndex + 1;
                  const lens = selectedOption.lenses[index];
                  const artCard = cardWithDrawMetadata(card, draw, index);
                  return (
                    <article key={card.cardId} className="deepWalkthroughCard">
                      <div className={`deepResultCardImage ${card.orientation === "reversed" ? "isReversed" : ""}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
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
                  <span>{walkthroughCount < 3 ? "第二個位置已看" : "三個位置都看過了"}</span>
                  <button className="primaryButton" type="button" onClick={advanceWalkthrough}>
                    {walkthroughCount < 3 ? `接著看「${selectedOption.lenses[2].label}」` : "把三張牌放在一起看"}
                  </button>
                </div>
              )}

              {showSynthesis && (
                <>
                  <section className="deepSynthesis deepSynthesisReveal">
                    <div className="deepVerdict">
                      <span>VELA 的結論</span>
                      <h2>{result.synthesis?.overview || "三張牌放在一起後，真正的重點已經比較清楚了。"}</h2>
                    </div>
                    {result.synthesis?.crossCardPattern && (
                      <div className="deepTurningPoint"><span>真正值得注意的是</span><p>{result.synthesis.crossCardPattern}</p></div>
                    )}
                    {Array.isArray(result.synthesis?.practicalGuidance) && result.synthesis.practicalGuidance.length > 0 && (
                      <div className="deepGuidanceBlock">
                        <span>接下來看這幾件事</span>
                        <div className="deepGuidanceList">{result.synthesis.practicalGuidance.map((item) => <span key={item}>{item}</span>)}</div>
                      </div>
                    )}
                    {result.synthesis?.narrative && (
                      <details className="deepSynthesisReasoning"><summary>為什麼我會這樣看？</summary><p>{result.synthesis.narrative}</p></details>
                    )}
                  </section>

                  <section className="deepContinuation">
                    <h2>還有哪一點，你想再確認一次？</h2>
                    <p>這次免費體驗可以沿用三張牌追問一次；真的還卡著時，再補一張。</p>
                    {followUps.map((item) => (
                      <article className="deepFollowUpExchange" key={item.question}>
                        <strong>你：{item.question}</strong>
                        <p>{item.answer}</p>
                        {item.practicalFocus && <small>{item.practicalFocus}</small>}
                      </article>
                    ))}
                    {followUps.length === 0 && (
                      <div className="deepFollowUpComposer">
                        <textarea rows={3} maxLength={320} value={followUpText} onChange={(event) => setFollowUpText(event.target.value)} placeholder="有哪一點還想確認？" />
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
                        <p>只補剛才沒解開的地方，不推翻前面的三張牌。</p>
                        <div className="deepClarifierPool">
                          {Array.from({ length: CLARIFIER_POOL_SIZE }, (_, index) => (
                            <button type="button" key={index} disabled={clarifierLoading} onClick={() => drawClarifier(index)} aria-label={`補充牌第 ${index + 1} 張`}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={CARD_BACK} alt="" draggable="false" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {clarifier && (
                      <article className="deepClarifierResult">
                        <div className={`deepResultCardImage ${clarifier.card.orientation === "reversed" ? "isReversed" : ""}`}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
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

                    <div className="deepReadingActions">
                      <span>這次免費深度解析已使用。</span>
                      <button className="ghostButton" type="button" onClick={onOpenPlans}>查看之後的方案</button>
                    </div>
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
