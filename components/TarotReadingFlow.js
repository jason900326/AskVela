"use client";

import { useMemo, useState } from "react";

const ORIENTATION_LABELS = { upright: "正位", reversed: "逆位" };

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

export default function TarotReadingFlow() {
  const [stage, setStage] = useState("welcome");
  const [question, setQuestion] = useState("");
  const [spreads, setSpreads] = useState([]);
  const [spreadId, setSpreadId] = useState("");
  const [requestId, setRequestId] = useState("");
  const [draw, setDraw] = useState(null);
  const [revealedCount, setRevealedCount] = useState(0);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const allRevealed = Boolean(draw?.cards?.length) && revealedCount >= draw.cards.length;
  const selectedSpread = spreads.find((spread) => spread.id === spreadId);
  const stepIndex = useMemo(() => {
    if (stage === "welcome" || stage === "question") return 1;
    if (stage === "spread") return 2;
    if (["drawing", "reveal"].includes(stage)) return 3;
    return 4;
  }, [stage]);

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

  async function drawCards() {
    if (!spreadId || loading) return;
    const id = makeRequestId();
    setRequestId(id);
    setLoading(true);
    setError("");
    setStage("drawing");
    setResult(null);
    setRevealedCount(0);

    try {
      const response = await fetch("/api/readings/draw", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": id },
        body: JSON.stringify({ question: question.trim(), spreadId, requestId: id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "目前無法完成抽牌。");
      setDraw(data);
      window.setTimeout(() => setStage("reveal"), 520);
    } catch (err) {
      setError(err.message || "目前無法完成抽牌。");
      setStage("spread");
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
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "目前無法完成解讀。");
      setResult(data);
      setStage("result");
    } catch (err) {
      setError(err.message || "目前無法完成解讀。");
      setStage("reveal");
    } finally {
      setLoading(false);
    }
  }

  function resetReading() {
    setStage("question");
    setQuestion("");
    setSpreadId("");
    setRequestId("");
    setDraw(null);
    setRevealedCount(0);
    setResult(null);
    setError("");
  }

  return (
    <section className="readingExperience" aria-live="polite">
      <header className="velaHeader">
        <div className="velaPortrait" aria-hidden="true"><span>☾</span></div>
        <div>
          <div className="eyebrow">ASKVELA · TAROT READING</div>
          <h1>{stage === "welcome" ? "今天，想問 Vela 什麼？" : "把問題交給牌面慢慢展開。"}</h1>
          <p>我會先看牌，再查 Waite 與 Mathers 的原典，把牌義放回你的問題裡；牌面提供的是方向，不是對未來的確定判決。</p>
        </div>
      </header>

      {stage !== "welcome" && (
        <div className="readingSteps" aria-label="占卜進度">
          <Step number="1" label="問題" active={stepIndex === 1} complete={stepIndex > 1} />
          <Step number="2" label="牌陣" active={stepIndex === 2} complete={stepIndex > 2} />
          <Step number="3" label="抽牌" active={stepIndex === 3} complete={stepIndex > 3} />
          <Step number="4" label="解讀" active={stepIndex === 4} complete={stage === "result"} />
        </div>
      )}

      {stage === "welcome" && (
        <div className="crystalStage">
          <button className="crystalBall" type="button" onClick={startReading} disabled={loading} aria-label="開始塔羅占卜">
            <span>✦</span><strong>{loading ? "準備中…" : "開始占卜"}</strong>
          </button>
          <p>不需要先登入。V1 會先讓你完整走完一次匿名占卜。</p>
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
          <div className="flowActions"><button className="ghostButton" type="button" onClick={() => setStage("question")}>修改問題</button><button className="primaryButton" type="button" onClick={drawCards} disabled={!spreadId || loading}>{loading ? "洗牌中…" : "洗牌並抽牌"}</button></div>
        </div>
      )}

      {stage === "drawing" && (
        <div className="readingPanel loadingPanel"><div className="shuffleGlyph" aria-hidden="true">✦</div><h2>正在洗牌…</h2><p>{selectedSpread?.nameZhTw}</p></div>
      )}

      {stage === "reveal" && draw && (
        <div className="readingPanel">
          <div className="panelHeading"><div><div className="eyebrow">STEP 03</div><h2>{allRevealed ? "牌已全部翻開" : "依序翻開你的牌"}</h2></div><span className="revealCounter">{revealedCount}/{draw.cards.length}</span></div>
          <div className={`cardSpread cards-${draw.cards.length}`}>
            {draw.cards.map((card, index) => <CardFace key={`${card.cardId}-${card.position}`} card={card} revealed={index < revealedCount} disabled={index !== revealedCount} onReveal={() => revealNext(index)} />)}
          </div>
          {allRevealed && <div className="flowActions centered"><button className="primaryButton" type="button" onClick={interpretReading} disabled={loading}>{loading ? "Vela 正在查閱原典…" : "請 Vela 解讀"}</button></div>}
        </div>
      )}

      {stage === "interpreting" && (
        <div className="readingPanel loadingPanel"><div className="velaPulse" aria-hidden="true">☾</div><h2>Vela 正在整理牌面與原典</h2><p>固定沿用剛才的抽牌結果，不會重新抽牌。</p><div className="progressLine"><span /></div></div>
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
