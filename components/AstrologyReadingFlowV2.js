"use client";

import { useEffect, useMemo, useState } from "react";
import { ASTROLOGY_SOURCE_READY } from "../lib/astrology-source-status.js";
import { getZodiacByBirthday, ZODIAC_SIGNS } from "../lib/zodiac.js";
import { shareVelaResultCard } from "../lib/share-result-card.js";
import VelaAccount from "./VelaAccount.js";
import VelaWaitingStage from "./VelaWaitingStage.js";

const ASTROLOGY_SESSION_KEY = "askvela.current-astrology.v1";

const ASTROLOGY_WAITING_LINES = [
  "我先看看今天的太陽和月亮。",
  "先把今天的天象放到你的星座旁邊。",
  "有些地方像推力，有些地方比較像提醒。",
  "工作和關係的節奏，我分開看一下。",
  "我在找今天最值得你留意的那個角度。",
  "有一兩個地方開始變得清楚了。",
  "再一下，我把最重要的地方先說給你聽。",
];

function makeRequestId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `astrology-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function localCalendarDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function AstrologyReadingFlowV2({ onExperienceChange }) {
  const [birthday, setBirthday] = useState("");
  const [period, setPeriod] = useState("daily");
  const [reading, setReading] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sessionRestored, setSessionRestored] = useState(false);
  const [shareNotice, setShareNotice] = useState("");

  const selectedSign = useMemo(() => getZodiacByBirthday(birthday), [birthday]);
  const restoredSign = useMemo(() => {
    if (!reading?.sign?.id) return null;
    return ZODIAC_SIGNS.find((sign) => sign.id === reading.sign.id) || reading.sign;
  }, [reading]);
  const result = reading?.result || null;
  const headline = reading?.velaSpeech?.overview || result?.overview || "";

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      try {
        const raw = window.sessionStorage.getItem(ASTROLOGY_SESSION_KEY);
        if (raw) {
          const saved = JSON.parse(raw);
          if (saved?.version === 1 && saved?.kind === "astrology" && saved?.readingId && saved?.result) {
            setReading(saved);
            setPeriod(saved.period || "daily");
          }
        }
      } catch {
        window.sessionStorage.removeItem(ASTROLOGY_SESSION_KEY);
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
    if (!sessionRestored || !reading) return;
    try { window.sessionStorage.setItem(ASTROLOGY_SESSION_KEY, JSON.stringify({ version: 1, ...reading })); } catch { /* ignore */ }
  }, [sessionRestored, reading]);

  async function submitReading(event) {
    event.preventDefault();
    if (!selectedSign || loading) return;
    if (!ASTROLOGY_SOURCE_READY) {
      setError("目前沒有足夠的星座來源可以完成這次解讀。");
      return;
    }
    setLoading(true);
    setError("");
    setShareNotice("");
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    const requestId = makeRequestId();

    try {
      const response = await fetch("/api/astrology/reading", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": requestId },
        body: JSON.stringify({
          signId: selectedSign.id,
          period,
          localDate: localCalendarDate(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
          requestId,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "目前無法完成星座解讀。");
      if (data.sourceGrounded !== true || !data.sources?.references?.length) {
        throw new Error("這次星座解讀沒有通過來源驗證，因此不顯示結果。");
      }
      setReading(data);
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    } catch (err) {
      setError(err.message || "目前無法完成星座解讀。");
    } finally {
      setLoading(false);
    }
  }

  function restoreSavedAstrology(saved) {
    if (!saved?.readingId || saved?.kind !== "astrology" || !saved?.result) return;
    setReading(saved);
    setPeriod(saved.period || "daily");
    setError("");
    setSessionRestored(true);
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }

  function resetReading() {
    try { window.sessionStorage.removeItem(ASTROLOGY_SESSION_KEY); } catch { /* ignore */ }
    setReading(null);
    setError("");
    setShareNotice("");
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
        modeLabel: `ASTROLOGY · ${reading.sign?.nameZhTw || "星座"}`,
        headline,
        subline: reading.period === "daily" ? "今日運勢" : "本週運勢",
        details: ["整體節奏", "工作與學業", "感情與關係", ...(result?.focusAreas || []).map((item) => item.title)],
      });
      setShareNotice(message);
    } catch (err) {
      if (err?.name !== "AbortError") setShareNotice(err.message || "這次沒有成功分享，可以再試一次。");
    }
  }

  if (loading) {
    return (
      <section className="astrologyExperience finalModeFlow">
        <VelaAccount experience="astrology" onExperienceChange={onExperienceChange} />
        <VelaWaitingStage lines={ASTROLOGY_WAITING_LINES} glyph={selectedSign?.glyph || restoredSign?.glyph || "☾"} className="astrologyWaiting" />
      </section>
    );
  }

  if (!reading) {
    return (
      <section className="astrologyExperience finalModeFlow">
        <VelaAccount experience="astrology" onExperienceChange={onExperienceChange} onRestoreAstrology={restoreSavedAstrology} />
        <form className="finalEntryCard astrologyBirthdayCard" onSubmit={submitReading}>
          <div className="eyebrow">VELA · ASTROLOGY</div>
          <h1>想看看誰最近的星象？</h1>
          <label className="finalDateField">
            <span>生日</span>
            <input type="date" value={birthday} onChange={(event) => setBirthday(event.target.value)} required />
          </label>
          {selectedSign && <div className="derivedSign"><span>{selectedSign.glyph}</span><strong>{selectedSign.nameZhTw}</strong><small>我會直接用生日判斷太陽星座。</small></div>}
          <div className="finalPeriodChoice" role="group" aria-label="運勢週期">
            <button type="button" className={period === "daily" ? "isSelected" : ""} onClick={() => setPeriod("daily")}>今日</button>
            <button type="button" className={period === "weekly" ? "isSelected" : ""} onClick={() => setPeriod("weekly")}>本週</button>
          </div>
          <button className="primaryButton finalPrimaryCta" type="submit" disabled={!selectedSign || !ASTROLOGY_SOURCE_READY}>請 Vela 看看</button>
        </form>
        {error && <div className="errorBox" role="alert"><strong>這次沒有成功。</strong><span>{error}</span></div>}
      </section>
    );
  }

  const focusAreas = Array.isArray(result?.focusAreas) && result.focusAreas.length
    ? result.focusAreas
    : [{ title: "步調與負荷", body: result?.energy || "" }].filter((item) => item.body);

  return (
    <section className="astrologyExperience finalModeFlow">
      <article className="finalReadingArticle astrologyFinalResult">
        <header className="finalReadingHero">
          <div className="eyebrow">VELA&apos;S ASTROLOGY NOTE</div>
          <small>{reading.sign?.nameZhTw} · {reading.period === "daily" ? "今日" : "本週"}</small>
          <h1>{headline}</h1>
        </header>

        <section className="finalReadingSection">
          <h2>整體節奏</h2>
          <p>{result?.overall}</p>
        </section>
        <section className="finalReadingSection">
          <h2>工作與學業</h2>
          <p>{result?.workStudy}</p>
        </section>
        <section className="finalReadingSection">
          <h2>感情與關係</h2>
          <p>{result?.relationships}</p>
        </section>
        {focusAreas.map((item, index) => (
          <section className="finalReadingSection" key={`${item.title}-${index}`}>
            <h2>{item.title}</h2>
            <p>{item.body}</p>
          </section>
        ))}

        {result?.reflectionQuestion && (
          <section className="velaCuriosityCard finalCuriosityCard">
            <div className="eyebrow">VELA 想問你</div>
            <p>{result.reflectionQuestion}</p>
          </section>
        )}

        <details className="finalDeepDetails">
          <summary>查看完整星座分析與依據</summary>
          <div>
            {result?.practicalGuidance?.length > 0 && (
              <section><h3>可以怎麼做</h3><ul>{result.practicalGuidance.map((item) => <li key={item}>{item}</li>)}</ul></section>
            )}
            <section><h3>這次解讀是怎麼來的？</h3><p>{result?.basisNote}</p><p>{reading.sources?.methodNote}</p></section>
            <section><h3>實際天象</h3><ul>{(reading.skyContext?.signals || []).map((signal) => <li key={signal}>{signal}</li>)}</ul></section>
          </div>
        </details>

        <VelaAccount activeAstrology={reading} onRestoreAstrology={restoreSavedAstrology} experience="astrology" onExperienceChange={onExperienceChange} />

        <div className="finalResultActions">
          <button className="primaryButton" type="button" onClick={shareReading}>分享結果</button>
          <button className="ghostButton" type="button" onClick={resetReading}>看另一個日期／週期</button>
          <button className="ghostButton" type="button" onClick={goHome}>回首頁</button>
        </div>
        {shareNotice && <p className="shareNotice" role="status">{shareNotice}</p>}
        <p className="readingDisclaimer">{reading.disclaimer}</p>
      </article>
    </section>
  );
}
