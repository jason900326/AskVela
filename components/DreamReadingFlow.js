"use client";

import { useEffect, useState } from "react";
import VelaAccount from "./VelaAccount.js";

const DREAM_SESSION_KEY = "askvela.current-dream.v1";

function makeRequestId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `dream-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function DreamReadingFlow({ initialDream = "", onExperienceChange }) {
  const [dreamText, setDreamText] = useState(() => String(initialDream || "").slice(0, 3000));
  const [contextText, setContextText] = useState("");
  const [reading, setReading] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sessionRestored, setSessionRestored] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      try {
        const raw = window.sessionStorage.getItem(DREAM_SESSION_KEY);
        if (raw) {
          const saved = JSON.parse(raw);
          if (saved?.version === 1 && saved?.kind === "dream" && saved?.readingId && saved?.result
            && saved?.sourceGrounded === true && saved?.sources?.references?.length) {
            setReading(saved);
            setDreamText(saved.dreamText || "");
            setContextText(saved.contextText || "");
          } else window.sessionStorage.removeItem(DREAM_SESSION_KEY);
        }
      } catch {
        window.sessionStorage.removeItem(DREAM_SESSION_KEY);
      } finally {
        if (!cancelled) setSessionRestored(true);
      }
    }, 0);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, []);

  useEffect(() => {
    if (!sessionRestored || !reading || reading.sourceGrounded !== true) return;
    try { window.sessionStorage.setItem(DREAM_SESSION_KEY, JSON.stringify({ version: 1, ...reading })); } catch {}
  }, [sessionRestored, reading]);

  async function submitDream(event) {
    event.preventDefault();
    if (dreamText.trim().length < 10 || loading) return;
    setLoading(true);
    setError("");
    const requestId = makeRequestId();
    try {
      const response = await fetch("/api/dreams/reading", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": requestId },
        body: JSON.stringify({ dreamText, contextText, requestId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "目前無法完成夢境解讀。");
      if (data.sourceGrounded !== true || !data.sources?.references?.length) throw new Error("這次夢境解讀沒有通過來源驗證，因此不顯示結果。");
      setReading(data);
    } catch (err) {
      setError(err.message || "目前無法完成夢境解讀。");
    } finally {
      setLoading(false);
    }
  }

  function resetReading() {
    try { window.sessionStorage.removeItem(DREAM_SESSION_KEY); } catch {}
    setReading(null);
    setError("");
    setDreamText("");
    setContextText("");
  }

  function restoreSavedDream(saved) {
    if (!saved?.readingId || saved?.kind !== "dream" || !saved?.result) return;
    if (saved.sourceGrounded !== true || !saved.sources?.references?.length) {
      setReading(null);
      setError("這筆夢境解讀目前無法重新驗證來源，因此不顯示舊結果。");
      return;
    }
    setReading(saved);
    setDreamText(saved.dreamText || "");
    setContextText(saved.contextText || "");
    setError("");
    setSessionRestored(true);
  }

  return (
    <section className="dreamExperience" aria-live="polite">
      <VelaAccount
        activeDream={reading}
        onRestoreDream={restoreSavedDream}
        experience="dream"
        onExperienceChange={onExperienceChange}
      />

      {!reading ? (
        <>
          <header className="dreamHero">
            <div className="dreamMoon" aria-hidden="true">☾</div>
            <div>
              <div className="eyebrow">ASKVELA · DREAM</div>
              <h1>把你還記得的夢告訴我。</h1>
              <p>不用把夢講得很完整。先說你記得的人、地方、發生的事和醒來後最強烈的感覺；Vela 會先整理夢本身，再用可追溯的歷史夢心理學來源提供幾種可能的理解，不會硬套固定夢辭典。</p>
            </div>
          </header>

          <aside className="dreamSourceGate">
            <strong>來源解讀已啟用</strong>
            <span>Freud 1913 + Havelock Ellis 1922</span>
            <small>兩者都作為歷史理論／觀察，不當成現代臨床診斷。</small>
          </aside>

          <form className="dreamPanel" onSubmit={submitDream}>
            <label className="dreamField">
              <span>夢裡發生了什麼？</span>
              <textarea rows={8} maxLength={3000} value={dreamText} onChange={(event) => setDreamText(event.target.value)} placeholder="例如：我夢到一直在一個很大的車站找月台，大家都走得很快，但我怎麼樣都找不到我要搭的火車。後來我突然發現手機也不見了，很焦急。" />
              <small>{dreamText.length}/3000 · 不用刻意整理成故事，片段也可以。</small>
            </label>
            <label className="dreamField">
              <span>最近有什麼可能和這個夢有關？ <em>選填</em></span>
              <textarea rows={3} maxLength={800} value={contextText} onChange={(event) => setContextText(event.target.value)} placeholder="例如：最近在考慮換工作，但還沒決定。" />
              <small>{contextText.length}/800 · 沒想到也可以留白，Vela 不會逼你把夢套進現實。</small>
            </label>
            <div className="dreamSubmitRow">
              <span>夢的細節只在你登入後才會保存到私人紀錄。</span>
              <button className="primaryButton" type="submit" disabled={dreamText.trim().length < 10 || loading}>{loading ? "Vela 正在整理夢境與來源…" : "請 Vela 解夢"}</button>
            </div>
          </form>
        </>
      ) : (
        <article className="dreamResult">
          <header className="dreamResultHeader">
            <div className="dreamMoon" aria-hidden="true">☾</div>
            <div><div className="eyebrow">VELA&apos;S DREAM NOTE</div><h2>{reading.result?.title}</h2><p>{reading.result?.dreamSummary}</p></div>
          </header>

          <section className="dreamEmotionalThread"><div className="eyebrow">夢裡最明顯的情緒線</div><p>{reading.result?.emotionalThread}</p></section>

          <section className="dreamInterpretation"><div className="eyebrow">Vela 怎麼把它放回你的情境</div><p>{reading.result?.interpretation}</p></section>

          <div className="dreamResultGrid">
            <section><h3>可能可以連到的地方</h3><ul>{(reading.result?.possibleConnections || []).map((item) => <li key={item}>{item}</li>)}</ul></section>
            <section><h3>可以問自己的兩件事</h3><ol>{(reading.result?.reflectionQuestions || []).map((item) => <li key={item}>{item}</li>)}</ol></section>
          </div>

          <section className="dreamNextStep"><div className="eyebrow">先做一件小事</div><p>{reading.result?.nextStep}</p></section>

          <details className="dreamBasis">
            <summary>這次解讀是怎麼來的？</summary>
            <div>
              <p>{reading.result?.basisNote}</p>
              <p>{reading.sources?.methodNote}</p>
              <div className="eyebrow">來源型觀察</div>
              <ul>{(reading.result?.sourceObservations || []).map((item) => <li key={item.evidenceId}><strong>{item.evidenceId}</strong> — {item.observation}</li>)}</ul>
              <div className="eyebrow">偵測到的夢境特徵</div>
              <p className="dreamTags">{(reading.extracted?.tags || []).join(" · ")}</p>
              <div className="eyebrow">參考來源</div>
              <ul>{(reading.sources?.references || []).map((reference) => <li key={`${reference.evidenceId}-${reference.location}`}><strong>{reference.author}</strong> — <em>{reference.title}</em>，{reference.edition}，{reference.location}</li>)}</ul>
            </div>
          </details>

          <p className="readingDisclaimer">{reading.disclaimer}</p>
          <div className="flowActions centered"><button className="ghostButton" type="button" onClick={resetReading}>解讀另一個夢</button></div>
        </article>
      )}

      {error && <div className="errorBox" role="alert"><strong>這次沒有成功。</strong><span>{error}</span></div>}
    </section>
  );
}
