"use client";

import { useEffect, useMemo, useState } from "react";
import VelaAccount from "./VelaAccount.js";

const SESSION_KEY = "askvela.current-dream.v1";
const PENDING_AUTH_KEY = "askvela.pending-auth-experience.v1";

function newRequestId() {
  if (globalThis.crypto?.randomUUID) return `dream-${globalThis.crypto.randomUUID()}`;
  return `dream-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function isBareDreamLead(value) {
  const text = String(value || "")
    .trim()
    .replace(/[，。！？!?、\s]/gu, "");

  return /^(?:我)?(?:昨晚|昨夜|昨天晚上)?(?:做|作)(?:了|過)?(?:一個|個|場)?(?:很|超|有點)?(?:怪|奇怪|可怕|特別|莫名其妙)?(?:的)?夢$/u.test(text)
    || /^(?:我)?(?:有|做了)?(?:一個|個|場)?(?:怪|奇怪|可怕|特別)?夢$/u.test(text);
}

function groupDreamSources(items = []) {
  const groups = new Map();
  for (const item of items) {
    if (!item?.source) continue;
    const key = item.source.id || `${item.source.author}-${item.source.title}`;
    if (!groups.has(key)) {
      groups.set(key, {
        ...item.source,
        principles: [],
      });
    }
    groups.get(key).principles.push(item.label);
  }
  return [...groups.values()];
}

export default function DreamReadingFlow({ initialDream = "", onExperienceChange = null }) {
  const [dreamText, setDreamText] = useState(initialDream || "");
  const [wakingLifeContext, setWakingLifeContext] = useState("");
  const [requestId, setRequestId] = useState(() => newRequestId());
  const [reading, setReading] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const sourceGroups = useMemo(() => groupDreamSources(reading?.sources || []), [reading]);
  const bareLead = isBareDreamLead(dreamText);
  const canInterpret = dreamText.trim().length >= 2 && !bareLead;

  function restoreDream(restored) {
    setReading(restored);
    setDreamText(restored?.dreamText || "");
    setWakingLifeContext(restored?.wakingLifeContext || "");
    setRequestId(restored?.requestId || newRequestId());
    setError("");
  }

  useEffect(() => {
    if (String(initialDream || "").trim()) {
      window.sessionStorage.removeItem(SESSION_KEY);
      return undefined;
    }

    let restoreTimer = null;
    try {
      const raw = window.sessionStorage.getItem(SESSION_KEY);
      if (!raw) return undefined;
      const saved = JSON.parse(raw);
      if (saved?.version === 1 && saved?.reading?.kind === "dream") {
        const restored = saved.reading;
        restoreTimer = window.setTimeout(() => {
          setReading(restored);
          setDreamText(restored.dreamText || "");
          setWakingLifeContext(restored.wakingLifeContext || "");
          setRequestId(restored.requestId || newRequestId());
          setError("");
        }, 0);
      }
    } catch {
      window.sessionStorage.removeItem(SESSION_KEY);
    }
    return () => {
      if (restoreTimer !== null) window.clearTimeout(restoreTimer);
    };
  }, [initialDream]);

  useEffect(() => {
    if (!reading) return;
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify({ version: 1, reading }));
  }, [reading]);

  useEffect(() => {
    function rememberDreamBeforeOAuth(event) {
      const googleButton = event.target?.closest?.(".googleAuthButton");
      if (!googleButton || !reading) return;
      window.sessionStorage.setItem(SESSION_KEY, JSON.stringify({ version: 1, reading }));
      window.sessionStorage.setItem(PENDING_AUTH_KEY, "dream");
    }

    document.addEventListener("click", rememberDreamBeforeOAuth, true);
    return () => document.removeEventListener("click", rememberDreamBeforeOAuth, true);
  }, [reading]);

  async function interpretDream(event) {
    event.preventDefault();
    if (loading || !canInterpret) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/dreams/reading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dreamText: dreamText.trim(), wakingLifeContext: wakingLifeContext.trim(), requestId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "目前無法解讀這個夢。");
      setReading(data);
      window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    } catch (err) {
      setError(err.message || "目前無法解讀這個夢。");
    } finally {
      setLoading(false);
    }
  }

  function startOver() {
    setReading(null);
    setDreamText("");
    setWakingLifeContext("");
    setRequestId(newRequestId());
    setError("");
    window.sessionStorage.removeItem(SESSION_KEY);
  }

  if (reading) {
    const [primaryHypothesis, ...otherHypotheses] = reading.result.hypotheses || [];

    return (
      <section className="dreamReadingFlow dreamReadingResult">
        <VelaAccount
          experience="dream"
          activeDream={reading}
          onRestoreDream={restoreDream}
          onExperienceChange={onExperienceChange}
        />

        <header className="dreamHero compact">
          <div className="eyebrow">VELA · 解夢</div>
          <h1>這個夢，我會先這樣看。</h1>
          <p>{reading.result.overview}</p>
        </header>

        {primaryHypothesis && (
          <section className="dreamMeaningCard">
            <div className="eyebrow">這個夢可能在反映</div>
            <h2>{primaryHypothesis.title}</h2>
            <p>{primaryHypothesis.interpretation}</p>
          </section>
        )}

        <section className="dreamMindsetCard">
          <div className="eyebrow">最近的心態線索</div>
          <p>{reading.result.wakingLifeConnection}</p>
        </section>

        {otherHypotheses.length > 0 && (
          <details className="dreamDetails">
            <summary>另外 {otherHypotheses.length} 種可能的看法</summary>
            <div className="dreamHypotheses isCollapsedSet">
              {otherHypotheses.map((item, index) => (
                <article key={`${item.title}-${index}`}>
                  <span>{String(index + 2).padStart(2, "0")}</span>
                  <div><h2>{item.title}</h2><p>{item.interpretation}</p></div>
                </article>
              ))}
            </div>
          </details>
        )}

        <details className="dreamDetails">
          <summary>我是從哪些夢裡線索這樣看的</summary>
          <ul className="dreamCompactList">
            {reading.result.whatStandsOut.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </details>

        {reading.result.reflectionQuestions?.length > 0 && (
          <details className="dreamDetails">
            <summary>如果你想再往下想一點（可選）</summary>
            <ul className="dreamCompactList">
              {reading.result.reflectionQuestions.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </details>
        )}

        <details className="dreamDetails dreamSourcesCompact">
          <summary>解讀依據 · Freud 為主</summary>
          <p>{reading.sourceNote || "目前解夢以可追溯的歷史心理學文本原則為參考。"}</p>
          <p>{reading.result.basisNote}</p>
          <div className="dreamSourceList compact">
            {sourceGroups.map((source) => (
              <article key={source.id}>
                <strong>{source.author} · {source.title}</strong>
                <span>{source.principles.join("、")}</span>
                <a href={source.sourceUrl} target="_blank" rel="noreferrer">查看公版原文</a>
              </article>
            ))}
          </div>
        </details>

        <aside className="dreamGrounding"><strong>Vela 的提醒：</strong> {reading.result.groundingNote}</aside>
        <p className="dreamDisclaimer">{reading.disclaimer}</p>

        <div className="dreamActions">
          <button className="primaryButton" type="button" onClick={startOver}>解讀另一個夢</button>
        </div>
      </section>
    );
  }

  return (
    <section className="dreamReadingFlow dreamReadingEntry">
      <VelaAccount experience="dream" onExperienceChange={onExperienceChange} onRestoreDream={restoreDream} />
      <header className="dreamHero dreamIntroHero">
        <div className="eyebrow">VELA · 解夢</div>
        <h1>先說你最記得的畫面就好。</h1>
        <p>一句也可以。像「我夢到蛇」、「我一直在跑」或「我回到高中」。不用先把整個夢拼完整，也不用先想它代表什麼。</p>
      </header>

      <form className="dreamForm dreamQuickForm" onSubmit={interpretDream}>
        <label>你還記得什麼？
          <textarea rows={4} maxLength={4000} value={dreamText} onChange={(event) => setDreamText(event.target.value)} placeholder="例如：我夢到蛇。" />
          <small>{dreamText.length}/4000</small>
        </label>

        {bareLead && (
          <div className="dreamFormNote">不用寫完整。只要再補一個你最記得的畫面、東西或感覺就夠了，例如「夢裡有蛇」或「我一直在跑」。</div>
        )}

        <details className="dreamOptionalDetails">
          <summary>想補充最近的生活背景（可選）</summary>
          <label>最近有什麼事讓你比較有感？
            <textarea rows={3} maxLength={1200} value={wakingLifeContext} onChange={(event) => setWakingLifeContext(event.target.value)} placeholder="不填也沒關係。" />
            <small>{wakingLifeContext.length}/1200</small>
          </label>
        </details>

        <div className="dreamFormNote isQuiet">只記得一個人、一個物件或一種感覺，也可以先從那裡開始。</div>
        {error && <div className="accountMessage isError" role="alert">{error}</div>}
        <button className="primaryButton dreamSubmit" type="submit" disabled={loading || !canInterpret}>{loading ? "Vela 正在整理這個夢…" : "先看看這個夢可能在說什麼"}</button>
      </form>
    </section>
  );
}
