"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ASTROLOGY_SOURCE_MESSAGE,
  ASTROLOGY_SOURCE_NEXT_STEP,
  ASTROLOGY_SOURCE_READY,
} from "../lib/astrology-source-status.js";
import { getZodiacByBirthday, ZODIAC_SIGNS } from "../lib/zodiac.js";
import VelaAccount from "./VelaAccount.js";

const ASTROLOGY_SESSION_KEY = "askvela.current-astrology.v1";

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
  const [error, setError] = useState("");
  const [sessionRestored, setSessionRestored] = useState(false);

  const selectedSign = useMemo(() => ZODIAC_SIGNS.find((sign) => sign.id === signId) || null, [signId]);

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
      setError(`${ASTROLOGY_SOURCE_MESSAGE} ${ASTROLOGY_SOURCE_NEXT_STEP}`);
      return;
    }
    if (!signId || loading) return;
    setLoading(true);
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

  return (
    <section className="astrologyExperience" aria-live="polite">
      <VelaAccount
        activeAstrology={reading}
        onRestoreAstrology={restoreSavedAstrology}
        experience="astrology"
        onExperienceChange={onExperienceChange}
      />

      {!reading ? (
        <>
          <header className="astrologyHero">
            <div className="astrologyGlyph" aria-hidden="true">✦</div>
            <div>
              <div className="eyebrow">ASKVELA · ASTROLOGY</div>
              <h1>今天，想看看哪個星座的節奏？</h1>
              <p>生日只用來協助選擇太陽星座。Vela 會先查閱 Alan Leo 與 Sepharial 的可追溯占星原則，再對照當天實際計算出的太陽與月亮位置做綜合，不會把本命月亮章節直接套成今日行運。</p>
            </div>
          </header>

          <aside className="astrologySourceGate" role="status">
            <strong>來源解讀已啟用</strong>
            <span>{ASTROLOGY_SOURCE_MESSAGE}</span>
            <small>{ASTROLOGY_SOURCE_NEXT_STEP}</small>
          </aside>

          <form className="astrologyPanel" onSubmit={submitReading}>
            <section className="astrologyInputGroup">
              <div className="panelHeading"><div><div className="eyebrow">STEP 01</div><h2>選擇你的太陽星座</h2></div></div>
              <label className="birthdayField">
                <span>不知道星座？輸入生日</span>
                <input type="date" value={birthday} onChange={(event) => updateBirthday(event.target.value)} />
                <small>只用生日幫你選太陽星座，不會保存生日。交界日期若你已知道自己的星座，可直接手動選擇。</small>
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

            <section className="astrologyInputGroup">
              <div className="panelHeading"><div><div className="eyebrow">STEP 02</div><h2>想看哪個時間範圍？</h2></div></div>
              <div className="periodToggle" role="group" aria-label="運勢週期">
                <button type="button" className={period === "daily" ? "isSelected" : ""} onClick={() => setPeriod("daily")} aria-pressed={period === "daily"}>今日運勢</button>
                <button type="button" className={period === "weekly" ? "isSelected" : ""} onClick={() => setPeriod("weekly")} aria-pressed={period === "weekly"}>本週運勢</button>
              </div>
            </section>

            <div className="astrologySubmitRow">
              <div>{selectedSign ? <span>{selectedSign.glyph} {selectedSign.nameZhTw} · {period === "daily" ? "今日" : "本週"}</span> : <span>先選一個星座</span>}</div>
              <button className="primaryButton" type="submit" disabled={!signId || loading || !ASTROLOGY_SOURCE_READY}>
                {ASTROLOGY_SOURCE_READY ? (loading ? "Vela 正在查閱來源…" : "請 Vela 解讀") : "等待星座來源資料庫"}
              </button>
            </div>
          </form>
        </>
      ) : (
        <article className="astrologyResult">
          <header className="astrologyResultHeader">
            <div className="astrologyResultGlyph" aria-hidden="true">{reading.sign?.glyph}</div>
            <div>
              <div className="eyebrow">VELA&apos;S ASTROLOGY NOTE</div>
              <small>{reading.sign?.nameZhTw} · {reading.period === "daily" ? "今日運勢" : "本週運勢"} · {reading.skyContext?.dateRange?.start}{reading.period === "weekly" ? ` ～ ${reading.skyContext?.dateRange?.end}` : ""}</small>
              <h2>{reading.result?.overview}</h2>
            </div>
          </header>

          <div className="astrologyResultGrid">
            <section><span>01</span><h3>整體</h3><p>{reading.result?.overall}</p></section>
            <section><span>02</span><h3>關係</h3><p>{reading.result?.relationships}</p></section>
            <section><span>03</span><h3>工作／學習</h3><p>{reading.result?.workStudy}</p></section>
            <section><span>04</span><h3>能量與節奏</h3><p>{reading.result?.energy}</p></section>
          </div>

          <section className="astrologyGuidance">
            <div className="eyebrow">今天可以先做</div>
            <ul>{(reading.result?.practicalGuidance || []).map((item) => <li key={item}>{item}</li>)}</ul>
          </section>

          <section className="astrologyReflection">
            <div className="eyebrow">留給你的問題</div>
            <p>{reading.result?.reflectionQuestion}</p>
          </section>

          <details className="astrologyBasis">
            <summary>這次解讀是怎麼來的？</summary>
            <div>
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
            </div>
          </details>

          <p className="readingDisclaimer">{reading.disclaimer}</p>
          <div className="flowActions centered"><button className="ghostButton" type="button" onClick={resetReading}>看另一個星座／週期</button></div>
        </article>
      )}

      {error && <div className="errorBox" role="alert"><strong>這次沒有成功。</strong><span>{error}</span></div>}
    </section>
  );
}
