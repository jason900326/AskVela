"use client";

import { useEffect, useMemo, useState } from "react";
import { ASTROLOGY_SOURCE_READY } from "../lib/astrology-source-status.js";
import { getZodiacByBirthday, ZODIAC_SIGNS } from "../lib/zodiac.js";
import VelaAccount from "./VelaAccount.js";

const ASTROLOGY_SESSION_KEY = "askvela.current-astrology.v1";

const ASTROLOGY_WAITING_LINES = [
  "我先看看今天的太陽和月亮落在哪裡。",
  "再把你選的星座放進今天的節奏裡。",
  "有些天象比較像推力，有些比較像提醒。",
  "我正在把今天的背景，和你真正需要留意的地方分開。",
  "關係、工作、自己的步調，我一個個看。",
  "有一兩個地方開始變得比較清楚了。",
  "再一下，我想先把最值得你知道的那一段說給你聽。",
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

export default function AstrologyReadingFlow({ onExperienceChange }) {
  const [birthday, setBirthday] = useState("");
  const [signId, setSignId] = useState("");
  const [period, setPeriod] = useState("daily");
  const [reading, setReading] = useState(null);
  const [loading, setLoading] = useState(false);
  const [waitingLine, setWaitingLine] = useState(0);
  const [error, setError] = useState("");
  const [sessionRestored, setSessionRestored] = useState(false);
  const [shareNotice, setShareNotice] = useState("");

  const selectedSign = useMemo(() => ZODIAC_SIGNS.find((sign) => sign.id === signId) || null, [signId]);
  const speechOverview = reading?.velaSpeech?.overview || reading?.result?.overview || "";
  const speechNarrative = reading?.velaSpeech?.narrative || reading?.result?.overall || "";

  useEffect(() => {
    if (!loading) {
      setWaitingLine(0);
      return undefined;
    }
    const timer = window.setInterval(() => {
      setWaitingLine((current) => (current + 1) % ASTROLOGY_WAITING_LINES.length);
    }, 3100);
    return () => window.clearInterval(timer);
  }, [loading]);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      try {
        const raw = window.sessionStorage.getItem(ASTROLOGY_SESSION_KEY);
        if (raw) {
          const saved = JSON.parse(raw);
          const trustworthySavedReading = saved?.version === 1
            && saved?.kind === "astrology"
            && saved?.readingId
            && saved?.result
            && saved?.sourceGrounded === true
            && Array.isArray(saved?.sources?.references)
            && saved.sources.references.length > 0;

          if (trustworthySavedReading) {
            setReading(saved);
            setSignId(saved.sign?.id || "");
            setPeriod(saved.period || "daily");
          } else {
            window.sessionStorage.removeItem(ASTROLOGY_SESSION_KEY);
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
    if (!sessionRestored || !reading || reading.sourceGrounded !== true) return;
    try {
      window.sessionStorage.setItem(ASTROLOGY_SESSION_KEY, JSON.stringify({ version: 1, ...reading }));
    } catch {
      // The reading remains usable even if browser storage is unavailable.
    }
  }, [sessionRestored, reading]);

  function updateBirthday(value) {
    setBirthday(value);
    const sign = getZodiacByBirthday(value);
    if (sign) setSignId(sign.id);
  }

  async function submitReading(event) {
    event.preventDefault();
    if (!ASTROLOGY_SOURCE_READY) {
      setError("目前沒有足夠的星座來源可以完成這次解讀。");
      return;
    }
    if (!signId || loading) return;
    setLoading(true);
    setWaitingLine(0);
    setError("");
    const requestId = makeRequestId();

    try {
      const response = await fetch("/api/astrology/reading", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": requestId },
        body: JSON.stringify({
          signId,
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
      window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    } catch (err) {
      setError(err.message || "目前無法完成星座解讀。");
    } finally {
      setLoading(false);
    }
  }

  function resetReading() {
    try {
      window.sessionStorage.removeItem(ASTROLOGY_SESSION_KEY);
    } catch {
      // Ignore storage failures while resetting local state.
    }
    setReading(null);
    setError("");
    setShareNotice("");
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }

  function restoreSavedAstrology(saved) {
    if (!saved?.readingId || saved?.kind !== "astrology" || !saved?.result) return;
    if (saved.sourceGrounded !== true || !saved.sources?.references?.length) {
      setReading(null);
      setError("這筆是來源系統完成前產生的舊版測試解讀。為了避免把沒有書籍依據的內容當成正式運勢，現在不再顯示它。");
      return;
    }
    setReading(saved);
    setSignId(saved.sign?.id || "");
    setPeriod(saved.period || "daily");
    setError("");
    setSessionRestored(true);
  }

  function goHome() {
    if (onExperienceChange) onExperienceChange("home");
    else window.dispatchEvent(new CustomEvent("vela:experience", { detail: "home" }));
  }

  async function shareReading() {
    if (!reading) return;
    const title = `Vela｜${reading.sign?.nameZhTw}${reading.period === "daily" ? "今日" : "本週"}運勢`;
    const text = `${speechOverview}\n\n${speechNarrative}`;
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url: window.location.href });
        setShareNotice("分享完成");
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(`${title}\n${text}\n${window.location.href}`);
        setShareNotice("已複製分享文字");
      }
    } catch (err) {
      if (err?.name !== "AbortError") setShareNotice("這次沒有成功分享，可以再試一次。");
    }
  }

  return (
    <section className="astrologyExperience" aria-live="polite">
      {!reading && (
        <VelaAccount
          experience="astrology"
          onRestoreAstrology={restoreSavedAstrology}
          onExperienceChange={onExperienceChange}
        />
      )}

      {!reading ? (
        loading ? (
          <section className="astrologyLoadingStage" aria-live="polite">
            <div className="astrologyLoadingGlyph" aria-hidden="true">{selectedSign?.glyph || "☾"}</div>
            <p className="astrologyWaitingLine" key={waitingLine}>{ASTROLOGY_WAITING_LINES[waitingLine]}</p>
            <div className="astrologyLoadingProgress" aria-hidden="true"><span /></div>
          </section>
        ) : (
          <>
            <header className="astrologyHero astrologyHeroMinimal">
              <h1>今天，想看看哪個星座？</h1>
            </header>

            <form className="astrologyPanel astrologyChoicePanel" onSubmit={submitReading}>
              <section className="astrologyInputGroup">
                <label className="birthdayField">
                  <span>不知道星座？輸入生日</span>
                  <input type="date" value={birthday} onChange={(event) => updateBirthday(event.target.value)} />
                </label>

                <div className="zodiacGrid" role="group" aria-label="十二星座">
                  {ZODIAC_SIGNS.map((sign) => (
                    <button
                      key={sign.id}
                      type="button"
                      className={signId === sign.id ? "isSelected" : ""}
                      onClick={() => setSignId(sign.id)}
                      aria-pressed={signId === sign.id}
                    >
                      <span aria-hidden="true">{sign.glyph}</span>
                      <strong>{sign.nameZhTw}</strong>
                      <small>{sign.element}象 · {sign.modality}</small>
                    </button>
                  ))}
                </div>
              </section>

              <section className="astrologyInputGroup astrologyPeriodGroup">
                <h2>想看哪個時間範圍？</h2>
                <div className="periodToggle" role="group" aria-label="運勢週期">
                  <button type="button" className={period === "daily" ? "isSelected" : ""} onClick={() => setPeriod("daily")} aria-pressed={period === "daily"}>今日運勢</button>
                  <button type="button" className={period === "weekly" ? "isSelected" : ""} onClick={() => setPeriod("weekly")} aria-pressed={period === "weekly"}>本週運勢</button>
                </div>
              </section>

              <div className="astrologySubmitRow">
                <div>{selectedSign ? <span>{selectedSign.glyph} {selectedSign.nameZhTw} · {period === "daily" ? "今日" : "本週"}</span> : <span>先選一個星座</span>}</div>
                <button className="primaryButton" type="submit" disabled={!signId || loading || !ASTROLOGY_SOURCE_READY}>請 Vela 看看</button>
              </div>
            </form>
          </>
        )
      ) : (
        <article className="astrologyResult">
          <header className="astrologyResultHeader">
            <div className="astrologyResultGlyph" aria-hidden="true">{reading.sign?.glyph}</div>
            <div>
              <div className="eyebrow">VELA&apos;S ASTROLOGY NOTE</div>
              <small>{reading.sign?.nameZhTw} · {reading.period === "daily" ? "今日運勢" : "本週運勢"} · {reading.skyContext?.dateRange?.start}{reading.period === "weekly" ? ` ～ ${reading.skyContext?.dateRange?.end}` : ""}</small>
              <h2>{speechOverview}</h2>
              <p className="velaSummary">{speechNarrative}</p>
            </div>
          </header>

          {reading.result?.reflectionQuestion && (
            <section className="velaCuriosityCard">
              <div className="eyebrow">VELA 想問你</div>
              <p>{reading.result.reflectionQuestion}</p>
            </section>
          )}

          <details className="astrologyBasis astrologyFullAnalysis">
            <summary>查看完整星座分析</summary>
            <div>
              <div className="astrologyResultGrid">
                <section><span>01</span><h3>整體</h3><p>{reading.result?.overall}</p></section>
                <section><span>02</span><h3>關係</h3><p>{reading.result?.relationships}</p></section>
                <section><span>03</span><h3>工作／學習</h3><p>{reading.result?.workStudy}</p></section>
                <section><span>04</span><h3>能量與節奏</h3><p>{reading.result?.energy}</p></section>
              </div>

              <section className="astrologyGuidance">
                <div className="eyebrow">可以怎麼做</div>
                <ul>{(reading.result?.practicalGuidance || []).map((item) => <li key={item}>{item}</li>)}</ul>
              </section>

              <section className="astrologyMethodDetail">
                <div className="eyebrow">這次解讀是怎麼來的？</div>
                <p>{reading.result?.basisNote}</p>
                <p>{reading.sources?.methodNote}</p>
                <div className="eyebrow">實際天象</div>
                <ul>{(reading.skyContext?.signals || []).map((signal) => <li key={signal}>{signal}</li>)}</ul>
                <div className="eyebrow">參考來源</div>
                <ul>
                  {(reading.sources?.references || []).map((reference) => (
                    <li key={`${reference.sourceId}-${reference.location}`}>
                      <strong>{reference.author}</strong> — <em>{reference.title}</em>，{reference.edition}，{reference.location}
                    </li>
                  ))}
                </ul>
                <small>{reading.skyContext?.method?.precisionNote}</small>
              </section>
            </div>
          </details>

          <p className="readingDisclaimer">{reading.disclaimer}</p>

          <VelaAccount
            activeAstrology={reading}
            onRestoreAstrology={restoreSavedAstrology}
            experience="astrology"
            onExperienceChange={onExperienceChange}
          />

          <div className="resultExitActions">
            <button className="primaryButton" type="button" onClick={shareReading}>分享這次結果</button>
            <button className="ghostButton" type="button" onClick={resetReading}>看另一個星座／週期</button>
            <button className="ghostButton" type="button" onClick={goHome}>回首頁</button>
          </div>
          {shareNotice && <p className="shareNotice" role="status">{shareNotice}</p>}
        </article>
      )}

      {error && <div className="errorBox" role="alert"><strong>這次沒有成功。</strong><span>{error}</span></div>}
    </section>
  );
}
