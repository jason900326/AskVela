"use client";

import { useEffect, useState } from "react";
import { shareVelaResultCard } from "../lib/share-result-card.js";
import VelaAccount from "./VelaAccount.js";
import VelaWaitingStage from "./VelaWaitingStage.js";

const SESSION_KEY = "askvela.current-dream.v1";

const DREAM_WAITING_LINES = [
  "我先把你最記得的那個畫面放在前面。",
  "夢裡有些細節很吵，有些反而躲得很安靜。",
  "我在分辨畫面本身，和醒來後留下的感覺。",
  "有一個地方我想多停一下，不急著下結論。",
  "我把幾個夢裡的線索放到一起看看。",
  "有個畫面開始比其他地方更有重量了。",
  "再一下，我先從最值得看的地方跟你說。",
];

const DREAM_FOLLOW_UP_LINES = [
  "好，我把你剛剛補的這個細節放回夢裡。",
  "這個回答讓其中一個角度有點變了。",
  "我先不推翻前面的解讀，只看哪裡需要修正。",
  "有一段現在比剛才更清楚。",
  "再一下，我把改變的地方直接告訴你。",
];

function newRequestId() {
  if (globalThis.crypto?.randomUUID) return `dream-${globalThis.crypto.randomUUID()}`;
  return `dream-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export default function DreamReadingFlowV2({ initialDream = "", onExperienceChange = null }) {
  const [dreamText, setDreamText] = useState(initialDream || "");
  const [requestId, setRequestId] = useState(() => newRequestId());
  const [reading, setReading] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [shareNotice, setShareNotice] = useState("");
  const [followUpAnswer, setFollowUpAnswer] = useState("");
  const [followUpNote, setFollowUpNote] = useState(null);
  const [followUpLoading, setFollowUpLoading] = useState(false);

  const result = reading?.result || null;
  const primaryHypothesis = result?.hypotheses?.[0] || null;
  const otherHypotheses = result?.hypotheses?.slice(1) || [];
  const curiosityQuestion = result?.reflectionQuestions?.[0] || "";
  const headline = reading?.velaSpeech?.overview || result?.overview || "";

  useEffect(() => {
    if (String(initialDream || "").trim()) {
      try { window.sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
      return undefined;
    }
    const timer = window.setTimeout(() => {
      try {
        const raw = window.sessionStorage.getItem(SESSION_KEY);
        if (!raw) return;
        const saved = JSON.parse(raw);
        if (saved?.version === 1 && saved?.reading?.kind === "dream") {
          setReading(saved.reading);
          setDreamText(saved.reading.dreamText || "");
          setRequestId(saved.reading.requestId || newRequestId());
        }
      } catch {
        window.sessionStorage.removeItem(SESSION_KEY);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [initialDream]);

  useEffect(() => {
    if (!reading) return;
    try { window.sessionStorage.setItem(SESSION_KEY, JSON.stringify({ version: 1, reading })); } catch { /* ignore */ }
  }, [reading]);

  async function interpretDream(event) {
    event.preventDefault();
    if (loading || dreamText.trim().length < 2) return;
    setLoading(true);
    setError("");
    setShareNotice("");
    setFollowUpNote(null);
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    try {
      const response = await fetch("/api/dreams/reading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dreamText: dreamText.trim(), wakingLifeContext: "", requestId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "目前無法解讀這個夢。");
      setReading(data);
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    } catch (err) {
      setError(err.message || "目前無法解讀這個夢。");
    } finally {
      setLoading(false);
    }
  }

  async function submitCuriosity(event) {
    event.preventDefault();
    const answer = followUpAnswer.trim();
    if (!answer || !reading || !curiosityQuestion || followUpLoading) return;
    setFollowUpLoading(true);
    setError("");
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    try {
      const response = await fetch("/api/dreams/follow-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dreamText: reading.dreamText || dreamText,
          question: curiosityQuestion,
          userAnswer: answer,
          originalOverview: headline,
          originalInterpretation: primaryHypothesis?.interpretation || "",
          wakingLifeConnection: result?.wakingLifeConnection || "",
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "目前無法接著看這個細節。");
      setFollowUpNote({ ...data, userAnswer: answer });
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    } catch (err) {
      setError(err.message || "目前無法接著看這個細節。");
    } finally {
      setFollowUpLoading(false);
    }
  }

  function restoreDream(restored) {
    if (!restored?.readingId) return;
    setReading(restored);
    setDreamText(restored.dreamText || "");
    setRequestId(restored.requestId || newRequestId());
    setError("");
    setFollowUpNote(null);
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }

  function startOver() {
    setReading(null);
    setDreamText("");
    setRequestId(newRequestId());
    setError("");
    setShareNotice("");
    setFollowUpAnswer("");
    setFollowUpNote(null);
    try { window.sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }

  function goHome() {
    if (onExperienceChange) onExperienceChange("home");
    else window.dispatchEvent(new CustomEvent("vela:experience", { detail: "home" }));
  }

  async function shareReading() {
    if (!reading) return;
    try {
      const message = await shareVelaResultCard({
        modeLabel: "DREAM · 夢境解析",
        headline,
        subline: primaryHypothesis?.title || "",
        details: (result?.whatStandsOut || []).slice(0, 3),
      });
      setShareNotice(message);
    } catch (err) {
      if (err?.name !== "AbortError") setShareNotice(err.message || "這次沒有成功分享，可以再試一次。");
    }
  }

  if (loading || followUpLoading) {
    return (
      <section className="dreamReadingFlow finalModeFlow">
        <VelaAccount experience="dream" onExperienceChange={onExperienceChange} />
        <VelaWaitingStage lines={followUpLoading ? DREAM_FOLLOW_UP_LINES : DREAM_WAITING_LINES} glyph="☾" className="dreamWaiting" />
      </section>
    );
  }

  if (!reading) {
    return (
      <section className="dreamReadingFlow finalModeFlow">
        <VelaAccount experience="dream" onExperienceChange={onExperienceChange} onRestoreDream={restoreDream} />
        <form className="finalEntryCard dreamFreeEntry" onSubmit={interpretDream}>
          <div className="eyebrow">VELA · 解夢</div>
          <h1>昨晚夢到什麼？</h1>
          <textarea
            rows={8}
            maxLength={4000}
            value={dreamText}
            onChange={(event) => setDreamText(event.target.value)}
            placeholder="不用整理得很完整。把你最記得的畫面、人物、聲音或感覺寫下來就好。"
            autoFocus
          />
          <div className="finalFormMeta"><span>{dreamText.length}/4000</span></div>
          <button className="primaryButton finalPrimaryCta" type="submit" disabled={dreamText.trim().length < 2}>請 Vela 看看</button>
        </form>
        {error && <div className="errorBox" role="alert"><strong>這次沒有成功。</strong><span>{error}</span></div>}
      </section>
    );
  }

  return (
    <section className="dreamReadingFlow finalModeFlow">
      <article className="finalReadingArticle dreamFinalResult">
        <header className="finalReadingHero">
          <div className="eyebrow">VELA · 解夢</div>
          <h1>{headline}</h1>
        </header>

        {primaryHypothesis && (
          <section className="finalReadingSection">
            <h2>這個夢可能在反映</h2>
            <h3>{primaryHypothesis.title}</h3>
            <p>{primaryHypothesis.interpretation}</p>
          </section>
        )}

        <section className="finalReadingSection">
          <h2>最近的心境線索</h2>
          <p>{result?.wakingLifeConnection}</p>
        </section>

        {result?.whatStandsOut?.length > 0 && (
          <section className="finalReadingSection">
            <h2>夢裡最值得留意的象徵</h2>
            <ul className="finalClueList">{result.whatStandsOut.map((item) => <li key={item}>{item}</li>)}</ul>
          </section>
        )}

        {curiosityQuestion && (
          <section className="velaCuriosityCard finalCuriosityCard">
            <div className="eyebrow">VELA 想問你</div>
            <p>{curiosityQuestion}</p>
            {!followUpNote ? (
              <form className="curiosityReplyForm" onSubmit={submitCuriosity}>
                <textarea rows={3} maxLength={1200} value={followUpAnswer} onChange={(event) => setFollowUpAnswer(event.target.value)} placeholder="把你第一個想到的答案告訴我就好。" />
                <button className="primaryButton" type="submit" disabled={!followUpAnswer.trim()}>回答 Vela</button>
              </form>
            ) : (
              <div className="dreamFollowUpNote">
                <small>{followUpNote.changedAngle}</small>
                <p>{followUpNote.response}</p>
              </div>
            )}
          </section>
        )}

        <details className="finalDeepDetails">
          <summary>查看完整夢境解析與依據</summary>
          <div>
            {otherHypotheses.map((item, index) => (
              <section key={`${item.title}-${index}`}><h3>{item.title}</h3><p>{item.interpretation}</p></section>
            ))}
            <section><h3>解讀依據</h3><p>{result?.basisNote}</p><p>{reading.sourceNote}</p></section>
            {result?.groundingNote && <section><h3>Vela 的提醒</h3><p>{result.groundingNote}</p></section>}
          </div>
        </details>

        <VelaAccount experience="dream" activeDream={reading} onRestoreDream={restoreDream} onExperienceChange={onExperienceChange} />

        <div className="finalResultActions">
          <button className="primaryButton" type="button" onClick={shareReading}>分享結果</button>
          <button className="ghostButton" type="button" onClick={startOver}>解讀另一個夢</button>
          <button className="ghostButton" type="button" onClick={goHome}>回首頁</button>
        </div>
        {shareNotice && <p className="shareNotice" role="status">{shareNotice}</p>}
        <p className="readingDisclaimer">{reading.disclaimer}</p>
      </article>
      {error && <div className="errorBox" role="alert"><strong>這次沒有成功。</strong><span>{error}</span></div>}
    </section>
  );
}
