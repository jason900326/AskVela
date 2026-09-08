"use client";

import { useEffect, useMemo, useState } from "react";
import { shareVelaResultCard } from "../lib/share-result-card.js";
import VelaAccount from "./VelaAccount.js";
import VelaWaitingStage from "./VelaWaitingStage.js";

const ORIENTATION_LABELS = { upright: "正位", reversed: "逆位" };
const READING_SESSION_KEY = "askvela.current-reading.v2";
const SELECTION_POOL_SIZE = 12;
const MAX_CLARIFIERS = 2;
const MAX_FOLLOW_UPS = 6;
const MAX_FOLLOW_UP_MESSAGE_LENGTH = 320;
const CLARIFIER_POOL_SIZE = 6;

const TAROT_INTERPRETING_LINES = [
  "我先看看，哪張牌最先開口。",
  "我把你剛剛抽到的牌重新放在一起。",
  "有一張牌和你問的事對得比預期更直接。",
  "我再看看它和旁邊那張是在支持還是拉扯。",
  "有些地方不是單看一張牌就會看見的。",
  "我差不多知道這次要先從哪裡說了。",
  "再一下，我把最重要的那段講清楚。",
];

const TAROT_CLARIFIER_LINES = [
  "好，我把你剛剛碰的那張牌翻過來。",
  "這張不是重算前面的牌，只補一個角度。",
  "我先看它和原本三張牌哪裡接得上。",
  "有個地方現在比剛才更清楚了。",
  "再一下，我直接告訴你它補上了什麼。",
];

const TAROT_DRAWING_LINES = [
  "我先把你選的牌收回來洗一下。",
  "牌的位置已經固定了。",
];

const RANK_NUMBER = { ace: "01", two: "02", three: "03", four: "04", five: "05", six: "06", seven: "07", eight: "08", nine: "09", ten: "10", page: "11", knight: "12", queen: "13", king: "14" };

function makeRequestId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `reading-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function tarotImagePath(card) {
  if (card.arcana === "major") {
    const filename = card.cardId.replace(/^major-/, "").replace(/-fool$/, "-the-fool").replace(/-magician$/, "-the-magician").replace(/-high-priestess$/, "-the-high-priestess").replace(/-empress$/, "-the-empress").replace(/-emperor$/, "-the-emperor").replace(/-hierophant$/, "-the-hierophant").replace(/-lovers$/, "-the-lovers").replace(/-chariot$/, "-the-chariot").replace(/-hermit$/, "-the-hermit").replace(/-hanged-man$/, "-the-hanged-man").replace(/-devil$/, "-the-devil").replace(/-tower$/, "-the-tower").replace(/-star$/, "-the-star").replace(/-moon$/, "-the-moon").replace(/-sun$/, "-the-sun").replace(/-world$/, "-the-world");
    return `/images/tarot/major/${filename}.webp`;
  }
  const rank = card.numberOrRank;
  return `/images/tarot/${card.suit}/${RANK_NUMBER[rank]}-${rank === "ace" ? "ace" : rank}-of-${card.suit}.webp`;
}

function sameSelection(left = [], right = []) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function cardSignature(cards = []) {
  return cards.map((card) => `${card.cardId}:${card.position}:${card.orientation}`).join("|");
}

function compactInitialReading(result) {
  const analysis = result?.analysisSynthesis || result?.synthesis || {};
  return {
    overview: analysis.overview || "",
    narrative: analysis.narrative || "",
    cards: (result?.cards || []).map((card) => ({
      cardId: card.cardId,
      contextInterpretation: card.contextInterpretation || "",
      practicalFocus: card.practicalFocus || "",
    })),
  };
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function CardFace({ card, revealed, onReveal, disabled }) {
  return (
    <button type="button" className={`tarotCard finalTarotCard ${revealed ? "isRevealed" : ""}`} onClick={onReveal} disabled={disabled || revealed}>
      <span className="tarotCardInner">
        <span className="tarotCardBack" aria-hidden="true" />
        <span className={`tarotCardFront ${card.orientation === "reversed" ? "isReversed" : ""}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={tarotImagePath(card)} alt={`${card.nameZhTw}（${ORIENTATION_LABELS[card.orientation]}）`} draggable="false" />
        </span>
      </span>
    </button>
  );
}

export default function TarotReadingFlowV4({ initialQuestion = "", onExperienceChange = null }) {
  const routedQuestion = String(initialQuestion || "").trim().slice(0, 500);
  const [stage, setStage] = useState(() => routedQuestion ? "routing" : "question");
  const [question, setQuestion] = useState(routedQuestion);
  const [spreads, setSpreads] = useState([]);
  const [spreadId, setSpreadId] = useState("");
  const [requestId, setRequestId] = useState("");
  const [selectedCardIndexes, setSelectedCardIndexes] = useState([]);
  const [draw, setDraw] = useState(null);
  const [revealedCount, setRevealedCount] = useState(0);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sessionRestored, setSessionRestored] = useState(false);
  const [clarifierSelecting, setClarifierSelecting] = useState(false);
  const [clarifierLoading, setClarifierLoading] = useState(false);
  const [clarifierError, setClarifierError] = useState("");
  const [followUps, setFollowUps] = useState([]);
  const [followUpMessage, setFollowUpMessage] = useState("");
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [followUpError, setFollowUpError] = useState("");
  const [shareNotice, setShareNotice] = useState("");

  const selectedSpread = spreads.find((spread) => spread.id === spreadId);
  const cardsNeeded = selectedSpread?.positions?.length || 0;
  const selectionComplete = cardsNeeded > 0 && selectedCardIndexes.length === cardsNeeded;
  const allRevealed = Boolean(draw?.cards?.length) && revealedCount >= draw.cards.length;
  const clarifiers = Array.isArray(result?.clarifiers) ? result.clarifiers : [];
  const clarifierLimitReached = clarifiers.length >= MAX_CLARIFIERS;
  const followUpLimitReached = followUps.length >= MAX_FOLLOW_UPS;

  const activeReading = useMemo(() => {
    if (stage !== "result" || !draw || !result || !requestId) return null;
    return {
      kind: "tarot",
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

  useEffect(() => {
    const stages = new Set(["spread", "select", "drawing", "reveal", "interpreting", "result"]);
    if (!stages.has(stage)) return;
    const frame = window.requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }));
    return () => window.cancelAnimationFrame(frame);
  }, [stage]);

  useEffect(() => {
    if (routedQuestion) {
      try { window.sessionStorage.removeItem(READING_SESSION_KEY); } catch { /* ignore */ }
      setSessionRestored(true);
      return undefined;
    }
    const timer = window.setTimeout(() => {
      try {
        const raw = window.sessionStorage.getItem(READING_SESSION_KEY);
        if (raw) {
          const saved = JSON.parse(raw);
          if (saved?.version === 2 && saved?.readingId && saved?.draw && saved?.result) {
            setQuestion(saved.question || saved.draw.question || "");
            setSpreadId(saved.spreadId || saved.draw.spread?.id || "");
            setRequestId(saved.requestId || "");
            setSelectedCardIndexes(Array.isArray(saved.selectedCardIndexes) ? saved.selectedCardIndexes : []);
            setDraw(saved.draw);
            setRevealedCount(saved.draw.cards?.length || 0);
            setResult(saved.result);
            setFollowUps(Array.isArray(saved.followUps) ? saved.followUps.slice(0, MAX_FOLLOW_UPS) : []);
            setStage("result");
          }
        }
      } catch {
        window.sessionStorage.removeItem(READING_SESSION_KEY);
      } finally {
        setSessionRestored(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [routedQuestion]);

  useEffect(() => {
    if (!routedQuestion) return undefined;
    let cancelled = false;
    setLoading(true);
    fetch("/api/spreads", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "目前無法載入牌陣。");
        if (!cancelled) {
          setSpreads(data.spreads || []);
          setStage("spread");
        }
      })
      .catch((err) => !cancelled && setError(err.message || "目前無法開始占卜。"))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [routedQuestion]);

  useEffect(() => {
    if (!sessionRestored || stage !== "result" || !activeReading) return;
    try { window.sessionStorage.setItem(READING_SESSION_KEY, JSON.stringify({ version: 2, ...activeReading })); } catch { /* ignore */ }
  }, [sessionRestored, stage, activeReading]);

  async function loadSpreadsThen(nextStage = "spread") {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/spreads", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "目前無法載入牌陣。");
      setSpreads(data.spreads || []);
      setStage(nextStage);
    } catch (err) {
      setError(err.message || "目前無法開始占卜。");
    } finally {
      setLoading(false);
    }
  }

  function submitQuestion(event) {
    event.preventDefault();
    if (!question.trim()) return;
    if (spreads.length) setStage("spread");
    else loadSpreadsThen("spread");
  }

  function prepareCardSelection() {
    if (!spreadId) return;
    setRequestId(makeRequestId());
    setSelectedCardIndexes([]);
    setDraw(null);
    setResult(null);
    setFollowUps([]);
    setClarifierSelecting(false);
    setClarifierError("");
    setRevealedCount(0);
    setStage("select");
  }

  function toggleCardSelection(index) {
    setSelectedCardIndexes((current) => {
      if (current.includes(index)) return current.filter((value) => value !== index);
      if (current.length >= cardsNeeded) return current;
      return [...current, index];
    });
  }

  async function drawCards() {
    if (!selectionComplete || !requestId || loading) return;
    setLoading(true);
    setError("");
    setStage("drawing");
    const started = Date.now();
    try {
      const response = await fetch("/api/readings/draw", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": requestId },
        body: JSON.stringify({ question: question.trim(), spreadId, requestId, selectedCardIndexes }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "目前無法完成抽牌。");
      if (!sameSelection(data.selectedCardIndexes || [], selectedCardIndexes)) throw new Error("選牌結果與伺服器確認的不一致。");
      const remaining = Math.max(0, 2800 - (Date.now() - started));
      if (remaining) await sleep(remaining);
      setDraw(data);
      setRevealedCount(0);
      setStage("reveal");
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
        body: JSON.stringify({ question: question.trim(), spreadId, requestId, readingId: draw.readingId, selectedCardIndexes }),
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

  async function chooseClarifier(slot) {
    if (!draw || !result || clarifierLoading || clarifierLimitReached) return;
    const existingSlots = clarifiers.map((item) => Number.isInteger(item.selectionSlot) ? item.selectionSlot : 0);
    setClarifierLoading(true);
    setClarifierSelecting(false);
    setClarifierError("");
    try {
      const response = await fetch("/api/readings/clarifier", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": `${requestId}:clarifier:${clarifiers.length + 1}:${slot}` },
        body: JSON.stringify({
          readingId: draw.readingId,
          requestId,
          question: question.trim(),
          spreadId,
          selectedCardIndexes,
          clarifierCount: clarifiers.length,
          clarifierSlots: [...existingSlots, slot],
          initialReading: compactInitialReading(result),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "目前無法補抽這張牌。");
      const used = new Set([...draw.cards.map((card) => card.cardId), ...clarifiers.map((item) => item.card?.cardId)]);
      if (!data?.card?.cardId || used.has(data.card.cardId)) throw new Error("這張補充牌與原本牌面重複，請再試一次。");
      setResult((current) => ({ ...current, clarifiers: [...(current?.clarifiers || []), data] }));
      window.setTimeout(() => document.getElementById("tarot-clarifier")?.scrollIntoView({ block: "center", behavior: "smooth" }), 40);
    } catch (err) {
      setClarifierError(err.message || "目前無法補抽這張牌。");
    } finally {
      setClarifierLoading(false);
    }
  }

  async function submitFollowUp(event) {
    event.preventDefault();
    const message = followUpMessage.trim();
    if (!message || !draw || !result || followUpLoading || followUpLimitReached) return;
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
      if (data.readingId !== draw.readingId || cardSignature(data.fixedCards) !== cardSignature(draw.cards)) throw new Error("追問沒有沿用原本牌面。");
      setFollowUps((items) => [...items, { question: message, answer: data.answer, practicalFocus: data.practicalFocus || "" }]);
      setFollowUpMessage("");
    } catch (err) {
      setFollowUpError(err.message || "目前無法完成追問。");
    } finally {
      setFollowUpLoading(false);
    }
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
    setStage("result");
    setSessionRestored(true);
  }

  function resetReading() {
    try { window.sessionStorage.removeItem(READING_SESSION_KEY); } catch { /* ignore */ }
    setQuestion("");
    setSpreadId("");
    setRequestId("");
    setSelectedCardIndexes([]);
    setDraw(null);
    setResult(null);
    setFollowUps([]);
    setFollowUpMessage("");
    setClarifierSelecting(false);
    setClarifierError("");
    setShareNotice("");
    setStage("question");
  }

  function goHome() {
    if (onExperienceChange) onExperienceChange("home");
    else window.dispatchEvent(new CustomEvent("vela:experience", { detail: "home" }));
  }

  async function shareReading() {
    if (!result || !draw) return;
    try {
      const message = await shareVelaResultCard({
        modeLabel: "TAROT · 塔羅",
        headline: result.synthesis?.overview || result.analysisSynthesis?.overview || "這次的牌面已經展開。",
        subline: question,
        details: draw.cards.map((card) => `${card.positionLabelZhTw}｜${card.nameZhTw}・${ORIENTATION_LABELS[card.orientation]}`),
      });
      setShareNotice(message);
    } catch (err) {
      if (err?.name !== "AbortError") setShareNotice(err.message || "這次沒有成功分享，可以再試一次。");
    }
  }

  if (stage === "routing" || stage === "drawing") {
    return (
      <section className={`readingExperience finalModeFlow stage-${stage}`}>
        <VelaAccount onRestoreReading={restoreSavedReading} />
        <VelaWaitingStage lines={stage === "drawing" ? TAROT_DRAWING_LINES : ["我先把牌準備好。"]} glyph="☾" className="tarotWaiting" />
      </section>
    );
  }

  if (stage === "interpreting" || clarifierLoading || followUpLoading) {
    return (
      <section className="readingExperience finalModeFlow stage-interpreting">
        <VelaAccount onRestoreReading={restoreSavedReading} />
        <VelaWaitingStage
          lines={clarifierLoading ? TAROT_CLARIFIER_LINES : followUpLoading ? TAROT_INTERPRETING_LINES.slice(2) : TAROT_INTERPRETING_LINES}
          glyph="☾"
          className="tarotWaiting"
        />
      </section>
    );
  }

  return (
    <section className={`readingExperience finalModeFlow stage-${stage}`} aria-live="polite">
      {stage !== "result" && <VelaAccount onRestoreReading={restoreSavedReading} />}

      {stage === "question" && (
        <form className="finalEntryCard tarotQuestionCard" onSubmit={submitQuestion}>
          <div className="eyebrow">VELA · TAROT</div>
          <h1>你想問什麼？</h1>
          <textarea rows={6} maxLength={500} value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="把最近最在意的那件事告訴我。" autoFocus />
          <div className="finalFormMeta"><span>{question.length}/500</span></div>
          <button className="primaryButton finalPrimaryCta" type="submit" disabled={!question.trim() || loading}>選牌陣</button>
        </form>
      )}

      {stage === "spread" && (
        <section className="finalSpreadStage">
          <h1>選一個牌陣</h1>
          <div className="finalSpreadGrid">
            {spreads.map((spread) => (
              <button key={spread.id} type="button" className={spreadId === spread.id ? "isSelected" : ""} onClick={() => setSpreadId(spread.id)}>
                <span>{spread.positions.length === 1 ? "◉" : "◉ ◉ ◉"}</span>
                <strong>{spread.nameZhTw}</strong>
                <small>{spread.positions.map((position) => position.labelZhTw).join(" · ")}</small>
              </button>
            ))}
          </div>
          <button className="primaryButton finalPrimaryCta" type="button" onClick={prepareCardSelection} disabled={!spreadId}>開始選牌</button>
        </section>
      )}

      {stage === "select" && selectedSpread && (
        <section className="finalTarotSelectionStage">
          <div className="finalTarotVela" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/vela/vela-tarot.webp" alt="" />
          </div>
          <div className="finalTarotSelectionCopy">
            <h1>選 {cardsNeeded} 張，我來幫你看看</h1>
            <span>{selectedCardIndexes.length}/{cardsNeeded}</span>
          </div>
          <div className="finalSelectionPositions">{selectedSpread.positions.map((position, index) => <span key={position.id}>{index + 1} {position.labelZhTw}</span>)}</div>
          <div className="finalCardPool">
            {Array.from({ length: SELECTION_POOL_SIZE }, (_, index) => {
              const order = selectedCardIndexes.indexOf(index);
              return (
                <button key={index} type="button" className={order >= 0 ? "isSelected" : ""} onClick={() => toggleCardSelection(index)}>
                  <span className="selectionCardBack" aria-hidden="true" />
                  {order >= 0 && <b>{order + 1}</b>}
                </button>
              );
            })}
          </div>
          <p className="selectionHint">{selectionComplete ? "選好了。" : `再選 ${cardsNeeded - selectedCardIndexes.length} 張。`}</p>
          <div className="finalStageActions"><button className="ghostButton" type="button" onClick={() => setStage("spread")}>重選牌陣</button><button className="primaryButton" type="button" onClick={drawCards} disabled={!selectionComplete}>翻開你選的牌</button></div>
        </section>
      )}

      {stage === "reveal" && draw && (
        <section className="finalRevealStage">
          <h1>{allRevealed ? "你選的牌都翻開了" : "依序翻開你選的牌"}</h1>
          <span className="revealCounter">{revealedCount}/{draw.cards.length}</span>
          <div className={`finalRevealCards cards-${draw.cards.length}`}>
            {draw.cards.map((card, index) => <CardFace key={`${card.cardId}-${card.position}`} card={card} revealed={index < revealedCount} disabled={index !== revealedCount} onReveal={() => revealNext(index)} />)}
          </div>
          {allRevealed && (
            <div className="finalRevealedLabels">{draw.cards.map((card) => <div key={`${card.cardId}-label`}><small>{card.positionLabelZhTw}</small><strong>{card.nameZhTw}</strong><span>{ORIENTATION_LABELS[card.orientation]}</span></div>)}</div>
          )}
          {allRevealed && <button className="primaryButton finalPrimaryCta" type="button" onClick={interpretReading}>請 Vela 解讀</button>}
        </section>
      )}

      {stage === "result" && result && draw && (
        <article className="finalReadingArticle tarotFinalResult">
          <header className="finalReadingHero">
            <div className="eyebrow">VELA&apos;S READING</div>
            <h1>{result.synthesis?.overview || result.analysisSynthesis?.overview || "這次的牌面已經展開。"}</h1>
          </header>

          <div className="tarotMainCards" aria-label="這次抽到的牌與主要解讀">
            {result.cards.map((card) => (
              <section className="finalReadingSection tarotMainCard" key={`${card.cardId}-${card.position}`}>
                <h2>{card.positionLabelZhTw}的牌，你抽到 {card.nameZhTw}・{ORIENTATION_LABELS[card.orientation]}</h2>
                <p>{card.contextInterpretation}</p>
                {card.practicalFocus && <div className="finalPracticalFocus"><strong>可以留意</strong><span>{card.practicalFocus}</span></div>}
              </section>
            ))}
          </div>

          {result.synthesis?.reflectionQuestions?.[0] && (
            <section className="velaCuriosityCard finalCuriosityCard"><div className="eyebrow">VELA 想問你</div><p>{result.synthesis.reflectionQuestions[0]}</p></section>
          )}

          <details className="finalDeepDetails">
            <summary>查看完整牌義與分析</summary>
            <div>
              {result.analysisSynthesis?.narrative && <section><h3>整體整理</h3><p>{result.analysisSynthesis.narrative}</p></section>}
              {result.synthesis?.crossCardPattern && <section><h3>牌與牌之間</h3><p>{result.synthesis.crossCardPattern}</p></section>}
              {result.synthesis?.practicalGuidance?.length > 0 && <section><h3>可以怎麼做</h3><ul>{result.synthesis.practicalGuidance.map((item) => <li key={item}>{item}</li>)}</ul></section>}
              {result.cards.map((card) => <section key={`source-${card.cardId}-${card.position}`}><h3>{card.nameZhTw}的原典牌義</h3><p>{card.sourceMeaning}</p></section>)}
            </div>
          </details>

          <section className="finalClarifierPanel" id="tarot-clarifier">
            <div className="eyebrow">還想抽牌？</div>
            <h2>有一個地方還沒看清楚，可以補一張。</h2>
            <p>補充牌不重算前面的牌陣，只沿著同一個問題再照亮一個角度。最多補 {MAX_CLARIFIERS} 張。</p>

            {clarifiers.length > 0 && <div className="finalClarifierList">{clarifiers.map((item) => (
              <article key={`clarifier-${item.ordinal}-${item.card.cardId}`}>
                <div className={`finalClarifierArt ${item.card.orientation === "reversed" ? "isReversed" : ""}`}><img src={tarotImagePath(item.card)} alt={item.card.nameZhTw} /></div>
                <div><small>第 {item.ordinal} 張補充牌</small><h3>{item.card.nameZhTw}・{ORIENTATION_LABELS[item.card.orientation]}</h3><p>{item.interpretation}</p>{item.practicalFocus && <div className="finalPracticalFocus"><span>{item.practicalFocus}</span></div>}</div>
              </article>
            ))}</div>}

            {!clarifierLimitReached && !clarifierSelecting && <button className="primaryButton" type="button" onClick={() => setClarifierSelecting(true)}>還想抽牌</button>}
            {clarifierSelecting && (
              <div className="clarifierPickStage">
                <p>憑第一眼的直覺，碰一張。</p>
                <div className="clarifierCardPool" role="group" aria-label="選一張補充牌">
                  {Array.from({ length: CLARIFIER_POOL_SIZE }, (_, slot) => <button key={slot} type="button" onClick={() => chooseClarifier(slot)} aria-label={`選第 ${slot + 1} 張補充牌`}><span className="selectionCardBack" /></button>)}
                </div>
                <button className="ghostButton" type="button" onClick={() => setClarifierSelecting(false)}>先不要</button>
              </div>
            )}
            {clarifierLimitReached && <small className="clarifierLimitText">這次先看到這裡。再抽下去容易把原本的訊息看散。</small>}
            {clarifierError && <div className="clarifierError" role="alert">{clarifierError}</div>}
          </section>

          <VelaAccount activeReading={activeReading} onRestoreReading={restoreSavedReading} />

          <section className="finalFollowUpPanel">
            <h2>還想沿著這組牌問一件事？</h2>
            {followUps.map((item, index) => <article key={`${index}-${item.question}`}><strong>你問：{item.question}</strong><p>{item.answer}</p></article>)}
            {!followUpLimitReached && <form onSubmit={submitFollowUp}><textarea rows={3} maxLength={MAX_FOLLOW_UP_MESSAGE_LENGTH} value={followUpMessage} onChange={(event) => setFollowUpMessage(event.target.value)} placeholder="例如：那我現在最需要先確認的是什麼？" /><button className="primaryButton" type="submit" disabled={!followUpMessage.trim()}>繼續問 Vela</button></form>}
            {followUpError && <div className="clarifierError" role="alert">{followUpError}</div>}
          </section>

          <div className="finalResultActions">
            <button className="primaryButton" type="button" onClick={shareReading}>分享結果</button>
            <button className="ghostButton" type="button" onClick={resetReading}>開始新的占卜</button>
            <button className="ghostButton" type="button" onClick={goHome}>回首頁</button>
          </div>
          {shareNotice && <p className="shareNotice" role="status">{shareNotice}</p>}
          <p className="readingDisclaimer">{result.disclaimer}</p>
        </article>
      )}

      {error && <div className="errorBox" role="alert"><strong>這一步沒有成功。</strong><span>{error}</span></div>}
    </section>
  );
}
