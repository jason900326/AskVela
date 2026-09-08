"use client";

import { useEffect, useState } from "react";
import VelaAccount from "./VelaAccount.js";

const SESSION_KEY = "askvela.current-dream.v1";

function newRequestId() {
  if (globalThis.crypto?.randomUUID) return `dream-${globalThis.crypto.randomUUID()}`;
  return `dream-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export default function DreamReadingFlow({ initialDream = "", onExperienceChange = null }) {
  const [dreamText, setDreamText] = useState(initialDream || "");
  const [wakingLifeContext, setWakingLifeContext] = useState("");
  const [requestId, setRequestId] = useState(() => newRequestId());
  const [reading, setReading] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(SESSION_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved?.version === 1 && saved?.reading?.kind === "dream") {
        setReading(saved.reading);
        setDreamText(saved.reading.dreamText || "");
        setWakingLifeContext(saved.reading.wakingLifeContext || "");
        setRequestId(saved.reading.requestId || newRequestId());
      }
    } catch {
      window.sessionStorage.removeItem(SESSION_KEY);
    }
  }, []);

  useEffect(() => {
    if (!reading) return;
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify({ version: 1, reading }));
  }, [reading]);

  async function interpretDream(event) {
    event.preventDefault();
    if (loading || dreamText.trim().length < 8) return;
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
    return (
      <section className="dreamReadingFlow">
        <VelaAccount experience="dream" />
        <header className="dreamHero compact">
          <div className="eyebrow">VELA · 解夢</div>
          <h1>我先不替這個夢下結論。</h1>
          <p>{reading.result.overview}</p>
        </header>

        <section className="dreamResultCard">
          <div className="eyebrow">夢裡最值得注意的地方</div>
          <ul>{reading.result.whatStandsOut.map((item) => <li key={item}>{item}</li>)}</ul>
        </section>

        <section className="dreamHypotheses">
          <div className="eyebrow">可以同時成立的幾種理解</div>
          {reading.result.hypotheses.map((item, index) => (
            <article key={`${item.title}-${index}`}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div><h2>{item.title}</h2><p>{item.interpretation}</p></div>
            </article>
          ))}
        </section>

        <section className="dreamResultGrid">
          <article><div className="eyebrow">和現實生活的連結</div><p>{reading.result.wakingLifeConnection}</p></article>
          <article><div className="eyebrow">可以問自己的問題</div><ul>{reading.result.reflectionQuestions.map((item) => <li key={item}>{item}</li>)}</ul></article>
        </section>

        <section className="dreamSources">
          <div className="eyebrow">這次解讀用了哪些依據</div>
          <p>{reading.result.basisNote}</p>
          <div className="dreamSourceList">
            {reading.sources.map((item) => (
              <article key={item.id}>
                <strong>{item.label}</strong>
                <p>{item.principle}</p>
                {item.source && <a href={item.source.sourceUrl} target="_blank" rel="noreferrer">{item.source.author} · {item.source.title} · {item.source.location}</a>}
              </article>
            ))}
          </div>
        </section>

        <aside className="dreamGrounding"><strong>先帶回現實：</strong> {reading.result.groundingNote}</aside>
        <p className="dreamDisclaimer">{reading.disclaimer}</p>

        <div className="dreamActions">
          <button className="primaryButton" type="button" onClick={startOver}>解讀另一個夢</button>
          {onExperienceChange && <button className="ghostButton" type="button" onClick={() => onExperienceChange("home")}>回到 Vela</button>}
        </div>
      </section>
    );
  }

  return (
    <section className="dreamReadingFlow">
      <VelaAccount experience="dream" />
      <header className="dreamHero">
        <div className="eyebrow">VELA · 解夢</div>
        <h1>把你還記得的夢告訴我。</h1>
        <p>不用先猜它代表什麼。先寫下人物、地方、發生的事和最強烈的感覺；我會先整理夢的內容，再用可追溯的心理學文本提出幾種可能的理解。</p>
      </header>

      <form className="dreamForm" onSubmit={interpretDream}>
        <label>夢裡發生了什麼？
          <textarea rows={8} maxLength={4000} value={dreamText} onChange={(event) => setDreamText(event.target.value)} placeholder="例如：我夢到自己一直趕火車，但每次快到月台時，車門就關上了。後來場景突然變成高中教室，我很急，可是所有人都像沒看到我一樣……" />
          <small>{dreamText.length}/4000</small>
        </label>
        <label>最近的現實背景（可不填）
          <textarea rows={3} maxLength={1200} value={wakingLifeContext} onChange={(event) => setWakingLifeContext(event.target.value)} placeholder="例如：最近正在等工作面試結果，也一直擔心自己是不是錯過了什麼機會。" />
          <small>{wakingLifeContext.length}/1200</small>
        </label>
        <div className="dreamFormNote">Vela 不會用固定「夢到 X 就等於 Y」的字典；你的個人聯想和最近生活會比通用符號更重要。</div>
        {error && <div className="accountMessage isError" role="alert">{error}</div>}
        <button className="primaryButton dreamSubmit" type="submit" disabled={loading || dreamText.trim().length < 8}>{loading ? "正在整理夢的線索…" : "讓 Vela 幫我解讀"}</button>
      </form>
    </section>
  );
}
