"use client";

import { useEffect, useMemo, useState } from "react";
import VelaAccount from "./VelaAccount.js";

const ORIENTATION_LABELS = { upright: "正位", reversed: "逆位" };
const READING_SESSION_KEY = "askvela.current-reading.v2";
const MAX_FOLLOW_UPS = 6;
const MAX_FOLLOW_UP_MESSAGE_LENGTH = 320;
const SELECTION_POOL_SIZE = 12;

function makeRequestId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `reading-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function Step({ active, complete, label, number }) {
  return (
    <div className={`readingStep ${active ? "isActive" : ""} ${complete ? "isComplete" : ""}`}>
      <span>{complete ? "✓" : number}</span>
      <strong>{label}</strong>
    </div>
  );
}

function CardFace({ card, revealed, onReveal, disabled }) {
  return (
    <button
      type="button"
      className={`tarotCard ${revealed ? "isRevealed" : ""}`}
      onClick={onReveal}
      disabled={disabled || revealed}
      aria-label={revealed ? `${card.positionLabelZhTw}：${card.nameZhTw}，${ORIENTATION_LABELS[card.orientation]}` : `翻開${card.positionLabelZhTw}的牌`}
    >
      <span className="tarotCardInner">
        <span className="tarotCardBack" aria-hidden="true">
          <i>✦</i>
          <b>ASK VELA</b>
          <small>{card.positionLabelZhTw}</small>
        </span>
        <span className="tarotCardFront">
          <small>{card.positionLabelZhTw}</small>
          <i aria-hidden="true">☾</i>
          <strong>{card.nameZhTw}</strong>
          <span>{card.nameEn}</span>
          <em>{ORIENTATION_LABELS[card.orientation]}</em>
        </span>
      </span>
    </button>
  );
}

function SourceList({ sources = [] }) {
  if (!sources.length) return null;
  return (
    <details className="readingSources">
      <summary>查看這張牌的參考來源</summary>
      <ul>
        {sources.map((source, index) => (
          <li key={`${source.sourceId || source.bookTitle || "source"}-${index}`}>
            <strong>{source.bookTitle || source.book || "來源"}</strong>
            {source.author ? ` · ${source.author}` : ""}
            {source.sectionType ? ` · ${source.sectionType}` : ""}
          </li>
        ))}
      </ul>
    </details>
  );
}

function compactInitialReading(result) {
  return {
    overview: result?.synthesis?.overview || "",
    narrative: result?.synthesis?.narrative || "",
    cards: (result?.cards || []).map((card) => ({
      cardId: card.cardId,
      contextInterpretation: card.contextInterpretation || "",
      practicalFocus: card.practicalFocus || "",
    })),
  };
}

function cardSignature(cards = []) {
  return cards.map((card) => `${card.cardId}:${card.position}:${card.orientation}`).join("|");
}

function sameSelection(left = [], right = []) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export default function TarotReadingFlow({ initialQuestion = "" }) {
  const [stage, setStage] = useState("welcome");
  const [question, setQuestion] = useState(() => String(initialQuestion || "").slice(0, 500));
  const [spreads, setSpreads] = useState([]);
  const [spreadId, setSpreadId] = useState("");
  const [requestId, setRequestId] = useState("");
  const [selectedCardIndexes, setSelectedCardIndexes] = useState([]);
  const [draw, setDraw] = useState(null);
  const [revealedCount, setRevealedCount] = useState(0);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [followUps, setFollowUps] = useState([]);
  const [followUpMessage, setFollowUpMessage] = useState("");
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [followUpError, setFollowUpError] = useState("");
  const [sessionRestored, setSessionRestored] = useState(false);

  const activeReading = useMemo(() => {
    if (stage !== "result" || !draw || !result || !requestId) return null;
    return {
      readingId: draw.readingId,
      requestId,
      question: question.trim(),
      spreadId,
      selectedCardIndexes,
      draw,
      result,
      followUps,
    };
  }, [stage, draw, result, requestId, question, spreadId, selectedCardIndexes, followUps]);

  const allRevealed = Boolean(draw?.cards?.length) && revealedCount >= draw.cards.length;
  const selectedSpread = spreads.find((spread) => spread.id === spreadId);
  const cardsNeeded = selectedSpread?.positions?.length || 0;
  const selectionComplete = cardsNeeded > 0 && selectedCardIndexes.length === cardsNeeded;
  const followUpLimitReached = followUps.length >= MAX_FOLLOW_UPS;
  const stepIndex = useMemo(() => {
    if (stage === "welcome" || stage === "question") return 1;
    if (stage === "spread") return 2;
    if (["select", "drawing", "reveal"].includes(stage)) return 3;
    return 4;
  }, [stage]);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      try {
        const raw = window.sessionStorage.getItem(READING_SESSION_KEY);
        if (raw) {
          const saved = JSON.parse(raw);
          const isValid = saved?.version === 2
            && saved?.readingId
            && saved?.requestId
            && saved?.question
            && saved?.spreadId
            && Array.isArray(saved?.selectedCardIndexes)
            && saved.selectedCardIndexes.length === saved?.draw?.cards?.length
            && saved?.draw?.readingId === saved.readingId
            && saved?.result?.readingId === saved.readingId;

          if (isValid) {
            setQuestion(saved.question);
            setSpreadId(saved.spreadId);
            setRequestId(saved.requestId);
            setSelectedCardIndexes(saved.selectedCardIndexes);
            setDraw(saved.draw);
            setRevealedCount(saved.draw?.cards?.length || 0);
            setResult(saved.result);
            setFollowUps(Array.isArray(saved.followUps) ? saved.followUps.slice(0, MAX_FOLLOW_UPS) : []);
            setStage("result");
          } else {
            window.sessionStorage.removeItem(READING_SESSION_KEY);
          }
        }
      } catch {
        window.sessionStorage.removeItem(READING_SESSION_KEY);
      } finally {
        if (!cancelled) setSessionRestored(true);
      }
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!sessionRestored || stage !== "result" || !draw || !result || !requestId) return;
    try {
      window.sessionStorage.setItem(READING_SESSION_KEY, JSON.stringify({
        version: 2,
        readingId: draw.readingId,
        requestId,
        question: question.trim(),
        spreadId,
        selectedCardIndexes,
        draw,
        result,
        followUps,
      }));
    } catch {
      // The reading remains usable even if browser storage is unavailable.
    }
  }, [sessionRestored, stage, draw, result, requestId, question, spreadId, selectedCardIndexes, followUps]);

  async function startReading() {
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/spreads", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "目前無法載入牌陣。");
      setSpreads(data.spreads || []);
      setStage("question");
    } catch (err) {
      setError(err.message || "目前無法開始占卜。");
    } finally {
      setLoading(false);
    }
  }

  function continueToSpread(event) {
    event.preventDefault();
    if (!question.trim()) return;
    setError("");
    setStage("spread");
  }

  function prepareCardSelection() {
    if (!spreadId || loading) return;
    setRequestId(makeRequestId());
    setSelectedCardIndexes([]);
    setDraw(null);
    setResult(null);
    setFollowUps([]);
    setFollowUpMessage("");
    setFollowUpError("");
    setRevealedCount(0);
    setError("");
    setStage("select");
  }

  function toggleCardSelection(index) {
    if (loading) return;
    setSelectedCardIndexes((current) => {
      if (current.includes(index)) return current.filter((value) => value !== index);
      if (current.length >= cardsNeeded) return current;
      return [...current, index];
    });
  }

  async function drawCards() {
    if (!spreadId || !requestId || !selectionComplete || loading) return;
    setLoading(true);
    setError("");
    setStage("drawing");
    setResult(null);
    setFollowUps([]);
    setFollowUpMessage("");
    setFollowUpError("");
    setRevealedCount(0);

    try {
      const response = await fetch("/api/readings/draw", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": requestId },
        body: JSON.stringify({
          question: question.trim(),
          spreadId,
          requestId,
          selectedCardIndexes,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "目前無法完成抽牌。");
      if (!sameSelection(data.selectedCardIndexes || [], selectedCardIndexes)) {
        throw new Error("選牌結果與伺服器確認的不一致，請重新選牌。");
      }
      setDraw(data);
      window.setTimeout(() => setStage("reveal"), 520);
    } catch (err) {
      setError(err.message || "目前無法完成抽牌。");
      setStage("select");
    } finally {
      setLoading(false);
    }
  }

  function revealNext(index) {
    if (index !== revealedCount) return;
    setRevealedCount((count) => count + 1);
  }

  async function interpretReading() {
    if (!draw || !requestId || loading) return;
    setLoading(true);
    setError("");
    setStage("interpreting");

    try {
      const response = await fetch("/api/readings/interpret", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": requestId },
        body: JSON.stringify({
          question: question.trim(),
          spreadId,
          requestId,
          readingId: draw.readingId,
          selectedCardIndexes,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "目前無法完成解讀。");
      setResult(data);
      setFollowUps([]);
      setStage("result");
    } catch (err) {
      setError(err.message || "目前無法完成解讀。");
      setStage("reveal");
    } finally {
      setLoading(false);
    }
  }

  async function submitFollowUp(event) {
    event.preventDefault();
    const message = followUpMessage.trim();
    if (!message || !draw || !result || !requestId || followUpLoading || followUpLimitReached) return;

    setFollowUpLoading(true);
    setFollowUpError("");

    try {
      const response = await fetch("/api/readings/follow-up", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": requestId },
        body: JSON.stringify({
          readingId: draw.readingId,
          requestId,
          question: question.trim(),
          spreadId,
          selectedCardIndexes,
          message,
          history: followUps.map((item) => ({ question: item.question, answer: item.answer })),
          initialReading: compactInitialReading(result),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "目前無法完成追問。");

      if (data.readingId !== draw.readingId || cardSignature(data.fixedCards) !== cardSignature(draw.cards)) {
        throw new Error("追問回覆與原本牌面不一致，已停止顯示這次回覆。請沿用同一次占卜重試。");
      }

      setFollowUps((items) => [...items, {
        question: message,
        answer: data.answer,
        practicalFocus: data.practicalFocus || "",
        safety: data.safety || null,
      }]);
      setFollowUpMessage("");
    } catch (err) {
      setFollowUpError(err.message || "目前無法完成追問；原本的牌面不會改變。");
    } finally {
      setFollowUpLoading(false);
    }
  }

  function resetReading() {
    try {
      window.sessionStorage.removeItem(READING_SESSION_KEY);
    } catch {
      // Ignore storage failures while resetting local state.
    }
    setStage(spreads.length ? "question" : "welcome");
    setQuestion("");
    setSpreadId("");
    setRequestId("");
    setSelectedCardIndexes([]);
    setDraw(null);
    setRevealedCount(0);
    setResult(null);
    setFollowUps([]);
    setFollowUpMessage("");
    setFollowUpError("");
    setError("");
  }

  function restoreSavedReading(saved) {
    if (!saved?.readingId || !saved?.draw || !saved?.result) return;
    setQuestion(saved.question || saved.draw.question || "");
    setSpreadId(saved.spreadId || saved.draw.spread?.id || "");
    setRequestId(saved.requestId || "");
    setSelectedCardIndexes(Array.isArray(saved.selectedCardIndexes) ? saved.selectedCardIndexes : []);
    setDraw(saved.draw);
    setRevealedCount(saved.draw.cards?.length || 0);
    setResult(saved.result);
    setFollowUps(Array.isArray(saved.followUps) ? saved.followUps.slice(0, MAX_FOLLOW_UPS) : []);
    setFollowUpMessage("");
    setFollowUpError("");
    setError("");
    setSessionRestored(true);
    setStage("result");
  }

  return (
    <section className={`readingExperience stage-${stage}`} aria-live="polite">
      <VelaAccount activeReading={activeReading} onRestoreReading={restoreSavedReading} />
      {stage === "welcome" && (
        <>
          <header className="velaHeader">
            <div className="velaPortrait" aria-hidden="true"><span>☾</span></div>
            <div>
              <div className="eyebrow">ASKVELA · TAROT READING</div>
              <h1>今天，想問 Vela 什麼？</h1>
              <p>我會先看牌，再查 Waite 與 Mathers 的原典，把牌義放回你的問題裡；牌面提供的是方向，不是對未來的確定判決。</p>
            </div>
          </header>

          <div className="crystalStage">
            <button className="crystalBall" type="button" onClick={startReading} disabled={loading} aria-label="開始塔羅占卜">
              <span>✦</span><strong>{loading ? "準備中…" : "開始占卜"}</strong>
            </button>
            <p>不需要先登入。V1 會先讓你完整走完一次匿名占卜。</p>
          </div>

          <section className="trustGrid" aria-label="AskVela 解讀原則">
            <article className="infoCard">
              <span>01</span>
              <h2>先抽牌，再查來源</h2>
              <p>牌面一旦固定，後續重試解讀也沿用同一組牌，不會因 API 錯誤重新抽牌。</p>
            </article>
            <article className="infoCard">
              <span>02</span>
              <h2>原典與情境分開</h2>
              <p>先整理 Waite、Mathers 等來源中的牌義，再把牌義放回你的問題與牌陣位置中解讀。</p>
            </article>
            <article className="infoCard">
              <span>03</span>
              <h2>保留不確定性</h2>
              <p>AskVela 提供象徵性反思與可能方向，不把牌面當成對未來或他人的確定判決。</p>
            </article>
          </section>
        </>
      )}

      {stage !== "welcome" && (
        <div className="readingSteps" aria-label="占卜進度">
          <Step number="1" label="問題" active={stepIndex === 1} complete={stepIndex > 1} />
          <Step number="2" label="牌陣" active={stepIndex === 2} complete={stepIndex > 2} />
          <Step number="3" label="選牌" active={stepIndex === 3} complete={stepIndex > 3} />
          <Step number="4" label="解讀" active={stepIndex === 4} complete={stage === "result"} />
        </div>
      )}

      {stage === "question" && (
        <form className="readingPanel" onSubmit={continueToSpread}>
          <div className="panelHeading"><div><div className="eyebrow">STEP 01</div><h2>你現在最想釐清什麼？</h2></div></div>
          <textarea value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={500} rows={5} placeholder="例如：我最近對工作方向很迷惘，接下來最值得留意的是什麼？" autoFocus />
          <div className="askActions"><span>{question.length}/500</span><button type="submit" disabled={!question.trim()}>選擇牌陣</button></div>
        </form>
      )}

      {stage === "spread" && (
        <div className="readingPanel">
          <div className="panelHeading"><div><div className="eyebrow">STEP 02</div><h2>選一個牌陣</h2></div></div>
          <div className="spreadGrid">
            {spreads.map((spread) => (
              <button key={spread.id} type="button" className={`spreadOption ${spreadId === spread.id ? "isSelected" : ""}`} onClick={() => setSpreadId(spread.id)} aria-pressed={spreadId === spread.id}>
                <span>{spread.positions.length === 1 ? "◉" : "◉ ◉ ◉"}</span>
                <strong>{spread.nameZhTw}</strong>
                <p>{spread.descriptionZhTw}</p>
                <small>{spread.positions.map((position) => position.labelZhTw).join(" · ")}</small>
              </button>
            ))}
          </div>
          <div className="flowActions"><button className="ghostButton" type="button" onClick={() => setStage("question")}>修改問題</button><button className="primaryButton" type="button" onClick={prepareCardSelection} disabled={!spreadId || loading}>讓 Vela 展牌</button></div>
        </div>
      )}

      {stage === "select" && selectedSpread && (
        <div className="readingPanel selectionPanel">
          <div className="panelHeading selectionHeading">
            <div>
              <div className="eyebrow">STEP 03 · 選牌</div>
              <h2>Vela 把牌展開了</h2>
              <p>照第一眼的直覺依序選牌。你點到的位置會對應到真正的牌，不是選完後再另外隨機抽。</p>
            </div>
            <span className="revealCounter">{selectedCardIndexes.length}/{cardsNeeded}</span>
          </div>

          <div className="selectionPositions" aria-label="選牌順序">
            {selectedSpread.positions.map((position, index) => (
              <span key={position.id} className={selectedCardIndexes.length > index ? "isChosen" : ""}>
                <b>{index + 1}</b>{position.labelZhTw}
              </span>
            ))}
          </div>

          <div className="cardFan" role="group" aria-label={`從 ${SELECTION_POOL_SIZE} 張牌中選擇 ${cardsNeeded} 張`}>
            {Array.from({ length: SELECTION_POOL_SIZE }, (_, index) => {
              const order = selectedCardIndexes.indexOf(index);
              const offset = index - (SELECTION_POOL_SIZE - 1) / 2;
              return (
                <button
                  key={index}
                  type="button"
                  className={`selectionCard ${order >= 0 ? "isSelected" : ""}`}
                  style={{
                    "--fan-rotation": `${offset * 1.45}deg`,
                    "--fan-lift": `${Math.abs(offset) * 1.4}px`,
                  }}
                  onClick={() => toggleCardSelection(index)}
                  aria-pressed={order >= 0}
                  aria-label={order >= 0 ? `已選為第 ${order + 1} 張，點擊取消` : `選擇第 ${index + 1} 個位置`}
                >
                  <span className="selectionCardBack" aria-hidden="true"><i>✦</i></span>
                  {order >= 0 && <span className="selectionOrder">{order + 1}<small>{selectedSpread.positions[order]?.labelZhTw}</small></span>}
                </button>
              );
            })}
          </div>

          <p className="selectionHint">{selectionComplete ? "選好了。接下來只會翻開你剛才親手選的牌。" : `再選 ${cardsNeeded - selectedCardIndexes.length} 張。已選的牌可以再點一次取消。`}</p>
          <div className="flowActions"><button className="ghostButton" type="button" onClick={() => setStage("spread")}>重選牌陣</button><button className="primaryButton" type="button" onClick={drawCards} disabled={!selectionComplete || loading}>翻開你選的牌</button></div>
        </div>
      )}

      {stage === "drawing" && (
        <div className="readingPanel loadingPanel"><div className="shuffleGlyph" aria-hidden="true">✦</div><h2>Vela 正在收起你選的牌</h2><p>{selectedSpread?.nameZhTw} · 選牌結果已固定</p></div>
      )}

      {stage === "reveal" && draw && (
        <div className="readingPanel revealPanel">
          <div className="panelHeading"><div><div className="eyebrow">STEP 03 · 翻牌</div><h2>{allRevealed ? "你選的牌已全部翻開" : "依序翻開你選的牌"}</h2></div><span className="revealCounter">{revealedCount}/{draw.cards.length}</span></div>
          <div className={`cardSpread cards-${draw.cards.length}`}>
            {draw.cards.map((card, index) => <CardFace key={`${card.cardId}-${card.position}`} card={card} revealed={index < revealedCount} disabled={index !== revealedCount} onReveal={() => revealNext(index)} />)}
          </div>
          {allRevealed && <div className="flowActions centered"><button className="primaryButton" type="button" onClick={interpretReading} disabled={loading}>{loading ? "Vela 正在查閱原典…" : "請 Vela 解讀"}</button></div>}
        </div>
      )}

      {stage === "interpreting" && (
        <div className="readingPanel loadingPanel"><div className="velaPulse" aria-hidden="true">☾</div><h2>Vela 正在整理牌面與原典</h2><p>固定沿用你剛才親手選的牌，不會重新抽牌。</p><div className="progressLine"><span /></div></div>
      )}

      {stage === "result" && result && (
        <article className="readingResult">
          <div className="resultIntro">
            <div className="eyebrow">VELA&apos;S READING</div>
            <h2>{result.synthesis?.overview || "這次的牌面已經展開。"}</h2>
            <p className="velaSummary">{result.synthesis?.narrative}</p>
          </div>

          <div className="resultCards" aria-label="各張牌的重點解讀">
            {result.cards.map((card) => (
              <section className="resultCard" key={`${card.cardId}-${card.position}`}>
                <div className="resultCardHeading"><div><small>{card.positionLabelZhTw}</small><h3>{card.nameZhTw} <span>{card.nameEn}</span></h3></div><em>{ORIENTATION_LABELS[card.orientation]}</em></div>
                <p>{card.contextInterpretation}</p>
                {card.practicalFocus && <div className="practicalFocus"><strong>可以留意</strong><span>{card.practicalFocus}</span></div>}
              </section>
            ))}
          </div>

          {result.synthesis?.practicalGuidance?.length > 0 && (
            <section className="quickGuidance">
              <div className="eyebrow">VELA 的建議</div>
              <ul>{result.synthesis.practicalGuidance.map((item) => <li key={item}>{item}</li>)}</ul>
            </section>
          )}

          <section className="followUpPanel" aria-labelledby="follow-up-title">
            <div className="followUpHeading">
              <div>
                <div className="eyebrow">STAY WITH THESE CARDS</div>
                <h3 id="follow-up-title">還想從這組牌多看一點嗎？</h3>
                <p>不用重新開始。Vela 會留在同一張占卜桌上，沿用剛才的牌與原典繼續看。</p>
              </div>
              <span className="fixedReadingBadge">同一組牌 · {followUps.length}/{MAX_FOLLOW_UPS}</span>
            </div>

            {followUps.length > 0 && (
              <div className="followUpThread" aria-live="polite">
                {followUps.map((item, index) => (
                  <article className="followUpExchange" key={`${index}-${item.question}`}>
                    <p className="followUpQuestion"><span>你問</span>{item.question}</p>
                    <div className="followUpVelaNote"><i aria-hidden="true">☾</i><div><small>Vela 沿著同一組牌繼續看</small><p>{item.answer}</p>{item.practicalFocus && <div className="followUpFocus"><strong>可以先留意</strong><span>{item.practicalFocus}</span></div>}</div></div>
                  </article>
                ))}
              </div>
            )}

            {!followUpLimitReached ? (
              <form className="followUpForm" onSubmit={submitFollowUp}>
                <textarea
                  value={followUpMessage}
                  onChange={(event) => setFollowUpMessage(event.target.value)}
                  maxLength={MAX_FOLLOW_UP_MESSAGE_LENGTH}
                  rows={3}
                  placeholder="例如：那我現在最需要先確認的是什麼？"
                  aria-label="針對這次占卜繼續追問"
                />
                <div className="followUpActions">
                  <span>{followUpMessage.length}/{MAX_FOLLOW_UP_MESSAGE_LENGTH}</span>
                  <button className="primaryButton" type="submit" disabled={!followUpMessage.trim() || followUpLoading}>{followUpLoading ? "Vela 正在看牌…" : "繼續看這組牌"}</button>
                </div>
              </form>
            ) : (
              <p className="followUpLimit">這次占卜的 {MAX_FOLLOW_UPS} 次追問已用完。想換一個問題時，可以開始新的占卜。</p>
            )}

            {followUpError && <div className="followUpError" role="alert"><strong>這次延伸解讀沒有成功。</strong><span>{followUpError}</span></div>}
          </section>

          <details className="deepReading">
            <summary>
              <span>查看完整牌義與分析</span>
              <small>原典牌義、牌與牌之間、參考來源</small>
            </summary>
            <div className="deepReadingBody">
              <section className="sourceMeaningSection">
                <div className="eyebrow">原典牌義</div>
                <div className="sourceMeaningGrid">
                  {result.cards.map((card) => (
                    <article className="sourceMeaningCard" key={`source-${card.cardId}-${card.position}`}>
                      <div className="sourceMeaningHeading"><strong>{card.nameZhTw}</strong><span>{ORIENTATION_LABELS[card.orientation]} · {card.positionLabelZhTw}</span></div>
                      <p>{card.sourceMeaning}</p>
                      {card.sourceLimitations?.length > 0 && (
                        <ul className="sourceLimitations">{card.sourceLimitations.map((item) => <li key={item}>{item}</li>)}</ul>
                      )}
                      <SourceList sources={card.sources} />
                    </article>
                  ))}
                </div>
              </section>

              {result.synthesis?.crossCardPattern && <section className="synthesisBlock"><div className="eyebrow">牌與牌之間</div><p>{result.synthesis.crossCardPattern}</p></section>}
              {result.synthesis?.reflectionQuestions?.length > 0 && <section className="synthesisBlock"><div className="eyebrow">留給你的問題</div><ul>{result.synthesis.reflectionQuestions.map((item) => <li key={item}>{item}</li>)}</ul></section>}
            </div>
          </details>

          <p className="readingDisclaimer">{result.disclaimer}</p>
          <div className="flowActions centered"><button className="ghostButton" type="button" onClick={resetReading}>開始新的占卜</button></div>
        </article>
      )}

      {error && (
        <div className="errorBox" role="alert">
          <strong>這一步沒有成功。</strong><span>{error}</span>
          {draw && stage === "reveal" && allRevealed && <button type="button" onClick={interpretReading}>沿用同一副牌重試解讀</button>}
        </div>
      )}
    </section>
  );
}
