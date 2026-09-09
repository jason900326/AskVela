"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getSupabaseBrowser } from "../lib/supabase-browser.js";

const TAROT_SESSION_KEY = "askvela.current-reading.v2";
const ASTROLOGY_SESSION_KEY = "askvela.current-astrology.v1";
const DREAM_SESSION_KEY = "askvela.current-dream.v1";

function translateAuthError(error) {
  const message = String(error?.message || "").toLowerCase();
  if (message.includes("invalid login credentials")) return "Email 或密碼不正確。";
  if (message.includes("email not confirmed")) return "請先到信箱完成 Email 驗證。";
  if (message.includes("user already registered")) return "這個 Email 已經註冊過了。";
  if (message.includes("password should be")) return "密碼至少需要 8 個字元。";
  if (message.includes("rate limit")) return "操作太頻繁，請稍後再試。";
  if (message.includes("provider is not enabled")) return "Google 登入目前尚未啟用。";
  return error?.message || "登入服務暫時沒有回應。";
}

function formatHistoryDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

async function authorizedFetch(client, url, options = {}) {
  const { data, error } = await client.auth.getSession();
  if (error || !data?.session?.access_token) throw new Error("登入狀態已失效，請重新登入。");

  return fetch(url, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
      Authorization: `Bearer ${data.session.access_token}`,
    },
    cache: "no-store",
  });
}

async function historyCollection(client, url) {
  try {
    const response = await authorizedFetch(client, url);
    const data = await response.json();
    if (!response.ok) return { ok: false, error: data.error || "目前無法載入紀錄。", readings: [] };
    return { ok: true, readings: data.readings || [] };
  } catch (error) {
    return { ok: false, error: error.message || "目前無法載入紀錄。", readings: [] };
  }
}

function historyEndpoint(kind, readingId = "") {
  const suffix = readingId ? `/${readingId}` : "";
  if (kind === "astrology") return `/api/astrology/history${suffix}`;
  if (kind === "dream") return `/api/dreams/history${suffix}`;
  return `/api/readings/history${suffix}`;
}

function entryFingerprint(entry) {
  if (!entry) return "";
  if (entry.kind === "astrology") {
    return JSON.stringify({ kind: "astrology", readingId: entry.readingId, result: entry.result });
  }
  if (entry.kind === "dream") {
    return JSON.stringify({ kind: "dream", readingId: entry.readingId, result: entry.result });
  }
  return JSON.stringify({ kind: "tarot", readingId: entry.readingId, followUps: entry.followUps });
}

function historyLabel(item) {
  if (item.kind === "astrology") return `${item.signNameZhTw} ${item.periodLabel}`;
  if (item.kind === "dream") return item.title || "夢境解讀";
  return item.question;
}

export default function VelaAccount({
  activeReading = null,
  activeAstrology = null,
  activeDream = null,
  onRestoreReading = null,
  onRestoreAstrology = null,
  onRestoreDream = null,
  experience = "tarot",
  onExperienceChange = null,
}) {
  const client = useMemo(() => getSupabaseBrowser(), []);
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(() => !client);
  const [portalReady, setPortalReady] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [historyNotice, setHistoryNotice] = useState("");
  const [saveState, setSaveState] = useState("idle");
  const [busyReadingId, setBusyReadingId] = useState("");
  const lastSavedFingerprint = useRef("");
  const activeEntry = activeDream || activeAstrology || activeReading;

  function changeExperience(next) {
    if (onExperienceChange) onExperienceChange(next);
    else window.dispatchEvent(new CustomEvent("vela:experience", { detail: next }));
  }

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!client) return undefined;

    let mounted = true;
    client.auth.getSession().then(({ data }) => {
      if (mounted) {
        setUser(data?.session?.user || null);
        setAuthReady(true);
      }
    });
    const { data: subscription } = client.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      setUser(session?.user || null);
      setAuthReady(true);
      if (event === "PASSWORD_RECOVERY") {
        setAuthMode("recovery");
        setAuthOpen(true);
        setAuthMessage("請設定新的密碼。");
      }
      if (event === "SIGNED_OUT") {
        setHistory([]);
        setHistoryOpen(false);
        setSaveState("idle");
        lastSavedFingerprint.current = "";
      }
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [client]);

  useEffect(() => {
    if (!client || !user || !activeEntry) return undefined;
    const fingerprint = entryFingerprint(activeEntry);
    if (fingerprint === lastSavedFingerprint.current) return undefined;

    const timer = window.setTimeout(async () => {
      setSaveState("saving");
      try {
        const response = await authorizedFetch(
          client,
          historyEndpoint(activeEntry.kind),
          { method: "POST", body: JSON.stringify(activeEntry) },
        );
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "目前無法保存這次解讀。");
        lastSavedFingerprint.current = fingerprint;
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    }, 450);

    return () => window.clearTimeout(timer);
  }, [client, user, activeEntry]);

  async function signInWithGoogle() {
    if (!client || authLoading) return;
    setAuthLoading(true);
    setAuthMessage("");

    try {
      const { error } = await client.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
    } catch (error) {
      setAuthMessage(translateAuthError(error));
      setAuthLoading(false);
    }
  }

  async function submitAuth(event) {
    event.preventDefault();
    if (!client || authLoading) return;
    setAuthLoading(true);
    setAuthMessage("");

    try {
      if (authMode === "signup") {
        const { data, error } = await client.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (data.session) {
          setAuthMessage(activeEntry ? "註冊完成，這次解讀會自動保存。" : "註冊完成。");
          window.setTimeout(() => setAuthOpen(false), 650);
        } else {
          setAuthMessage("驗證信已寄出；完成 Email 驗證後再回來登入。");
        }
      } else if (authMode === "recovery") {
        const { error } = await client.auth.updateUser({ password });
        if (error) throw error;
        setAuthMessage("密碼已更新。");
        window.setTimeout(() => setAuthOpen(false), 650);
      } else {
        const { error } = await client.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        setAuthMessage(activeEntry ? "登入成功，正在保存這次解讀。" : "登入成功。");
        window.setTimeout(() => setAuthOpen(false), 650);
      }
    } catch (error) {
      setAuthMessage(translateAuthError(error));
    } finally {
      setAuthLoading(false);
    }
  }

  async function sendPasswordReset() {
    if (!client || !email.trim() || authLoading) {
      setAuthMessage("請先輸入註冊時使用的 Email。");
      return;
    }
    setAuthLoading(true);
    setAuthMessage("");
    try {
      const { error } = await client.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin });
      if (error) throw error;
      setAuthMessage("重設密碼連結已寄出。");
    } catch (error) {
      setAuthMessage(translateAuthError(error));
    } finally {
      setAuthLoading(false);
    }
  }

  async function loadHistory() {
    if (!client || !user) return;
    setHistoryOpen(true);
    setHistoryLoading(true);
    setHistoryError("");
    setHistoryNotice("");

    if (activeEntry) {
      const fingerprint = entryFingerprint(activeEntry);
      if (fingerprint !== lastSavedFingerprint.current) {
        setSaveState("saving");
        try {
          const response = await authorizedFetch(
            client,
            historyEndpoint(activeEntry.kind),
            { method: "POST", body: JSON.stringify(activeEntry) },
          );
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || "目前無法保存這次解讀。");
          lastSavedFingerprint.current = fingerprint;
          setSaveState("saved");
        } catch (error) {
          setSaveState("error");
          setHistoryError(error.message || "這次解讀尚未保存，請再試一次。");
          setHistoryLoading(false);
          return;
        }
      }
    }

    const [tarotResult, astrologyResult, dreamResult] = await Promise.all([
      historyCollection(client, "/api/readings/history"),
      historyCollection(client, "/api/astrology/history"),
      historyCollection(client, "/api/dreams/history"),
    ]);

    const results = [tarotResult, astrologyResult, dreamResult];
    const entries = [
      ...tarotResult.readings.map((item) => ({ ...item, kind: "tarot" })),
      ...astrologyResult.readings.map((item) => ({ ...item, kind: "astrology" })),
      ...dreamResult.readings.map((item) => ({ ...item, kind: "dream" })),
    ].sort((left, right) => new Date(right.updatedAt || 0) - new Date(left.updatedAt || 0));

    setHistory(entries);
    const failed = results.filter((result) => !result.ok);
    if (failed.length === results.length) {
      setHistoryError(failed[0]?.error || "目前無法載入紀錄。");
    } else if (failed.length) {
      setHistoryNotice("部分紀錄暫時無法載入；已先顯示可用的內容。");
    }
    setHistoryLoading(false);
  }

  async function openHistoryItem(item) {
    setBusyReadingId(item.readingId);
    setHistoryError("");
    try {
      const response = await authorizedFetch(client, historyEndpoint(item.kind, item.readingId));
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "目前無法開啟這筆紀錄。");

      if (item.kind === "astrology") {
        if (experience === "astrology" && onRestoreAstrology) {
          onRestoreAstrology(data.reading);
        } else {
          window.sessionStorage.setItem(ASTROLOGY_SESSION_KEY, JSON.stringify({ version: 1, ...data.reading }));
          changeExperience("astrology");
        }
      } else if (item.kind === "dream") {
        if (experience === "dream" && onRestoreDream) {
          onRestoreDream(data.reading);
        } else {
          window.sessionStorage.setItem(DREAM_SESSION_KEY, JSON.stringify({ version: 1, reading: data.reading }));
          changeExperience("dream");
        }
      } else if (experience === "tarot" && onRestoreReading) {
        onRestoreReading(data.reading);
      } else {
        window.sessionStorage.setItem(TAROT_SESSION_KEY, JSON.stringify({ version: 2, ...data.reading }));
        changeExperience("tarot");
      }

      lastSavedFingerprint.current = entryFingerprint(data.reading);
      setHistoryOpen(false);
    } catch (error) {
      setHistoryError(error.message || "目前無法開啟這筆紀錄。");
    } finally {
      setBusyReadingId("");
    }
  }

  async function deleteHistoryItem(item) {
    const label = historyLabel(item);
    if (!window.confirm(`要永久刪除「${label}」這筆紀錄嗎？`)) return;
    setBusyReadingId(item.readingId);
    setHistoryError("");
    try {
      const response = await authorizedFetch(client, historyEndpoint(item.kind, item.readingId), { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "目前無法刪除這筆紀錄。");
      setHistory((items) => items.filter((candidate) => !(candidate.kind === item.kind && candidate.readingId === item.readingId)));
    } catch (error) {
      setHistoryError(error.message || "目前無法刪除這筆紀錄。");
    } finally {
      setBusyReadingId("");
    }
  }

  async function clearHistory() {
    if (!history.length || !window.confirm("要永久清除這個帳號的所有 Vela 紀錄嗎？此操作無法復原。")) return;
    setHistoryLoading(true);
    setHistoryError("");
    try {
      const results = await Promise.all([
        authorizedFetch(client, "/api/readings/history", { method: "DELETE" }),
        authorizedFetch(client, "/api/astrology/history", { method: "DELETE" }),
        authorizedFetch(client, "/api/dreams/history", { method: "DELETE" }),
      ]);
      const payloads = await Promise.all(results.map((response) => response.json()));
      const failed = results.findIndex((response) => !response.ok);
      if (failed >= 0) throw new Error(payloads[failed]?.error || "目前無法清除全部紀錄。");
      setHistory([]);
    } catch (error) {
      setHistoryError(error.message || "目前無法清除全部紀錄。");
    } finally {
      setHistoryLoading(false);
    }
  }

  async function signOut() {
    if (!client) return;
    await client.auth.signOut();
  }

  if (!authReady) return null;

  const savePromptTitle = activeEntry?.kind === "astrology"
    ? "想把這次星座解讀留下來嗎？"
    : activeEntry?.kind === "dream"
      ? "想把這次夢境解讀留下來嗎？"
      : "想把這次牌面留下來嗎？";

  const accountPortal = portalReady ? createPortal(
    <>
      <div className="accountDock" aria-label="Vela 帳號">
        {!client ? (
          <span className="accountUnavailable">匿名模式</span>
        ) : user ? (
          <>
            {activeEntry && <span className={`saveState is-${saveState}`}>{saveState === "saving" ? "保存中…" : saveState === "saved" ? "已保存" : saveState === "error" ? "尚未保存" : ""}</span>}
            <button type="button" onClick={loadHistory}>我的紀錄</button>
            <button className="accountAvatar" type="button" onClick={signOut} title={`${user.email} · 點擊登出`} aria-label={`${user.email}，點擊登出`}>
              {String(user.email || "V").slice(0, 1).toUpperCase()}
            </button>
          </>
        ) : (
          <button type="button" onClick={() => { setAuthMode("signin"); setAuthMessage(""); setAuthOpen(true); }}>登入</button>
        )}
      </div>

      {authOpen && (
        <div className="accountOverlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setAuthOpen(false); }}>
          <section className="accountModal" role="dialog" aria-modal="true" aria-labelledby="account-title">
            <button className="accountClose" type="button" onClick={() => setAuthOpen(false)} aria-label="關閉">×</button>
            <div className="eyebrow">VELA ACCOUNT</div>
            <h2 id="account-title">{authMode === "signup" ? "建立帳號" : authMode === "recovery" ? "設定新密碼" : "歡迎回來"}</h2>
            <p>{authMode === "recovery" ? "輸入新的密碼後即可回到 Vela。" : "登入不是使用 Vela 的門票，而是讓你能跨裝置保留值得回看的解讀。"}</p>
            {authMode !== "recovery" && (
              <>
                <button className="googleAuthButton" type="button" onClick={signInWithGoogle} disabled={authLoading}>
                  <span className="googleAuthMark" aria-hidden="true">G</span>
                  使用 Google 繼續
                </button>
                <div className="accountDivider" aria-hidden="true"><span>或使用 Email</span></div>
              </>
            )}
            <form onSubmit={submitAuth}>
              {authMode !== "recovery" && <label>Email<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>}
              <label>密碼<input type="password" autoComplete={authMode === "signin" ? "current-password" : "new-password"} minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
              <button className="primaryButton accountSubmit" type="submit" disabled={authLoading}>{authLoading ? "請稍候…" : authMode === "signup" ? "註冊" : authMode === "recovery" ? "更新密碼" : "登入並保存"}</button>
            </form>
            {authMessage && <div className="accountMessage" role="status">{authMessage}</div>}
            {authMode === "signin" && <button className="accountTextButton" type="button" onClick={sendPasswordReset}>忘記密碼</button>}
            {authMode !== "recovery" && (
              <button className="accountModeSwitch" type="button" onClick={() => { setAuthMode(authMode === "signup" ? "signin" : "signup"); setAuthMessage(""); }}>
                {authMode === "signup" ? "已經有帳號？登入" : "還沒有帳號？註冊"}
              </button>
            )}
          </section>
        </div>
      )}

      {historyOpen && (
        <div className="accountOverlay historyOverlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setHistoryOpen(false); }}>
          <section className="historyPanel" role="dialog" aria-modal="true" aria-labelledby="history-title">
            <div className="historyHeader">
              <div><div className="eyebrow">YOUR VELA HISTORY</div><h2 id="history-title">我的紀錄</h2></div>
              <button className="accountClose" type="button" onClick={() => setHistoryOpen(false)} aria-label="關閉">×</button>
            </div>
            <p className="historyPrivacy">只顯示這個登入帳號保存的私人紀錄；新解讀不會自動讀取舊內容。紀錄會在最後一次保存 365 天後到期，你也可以隨時刪除。</p>
            {historyLoading && <p className="historyEmpty">正在整理你的 Vela 紀錄…</p>}
            {historyNotice && <div className="accountMessage" role="status">{historyNotice}</div>}
            {historyError && <div className="accountMessage isError" role="alert">{historyError}</div>}
            {!historyLoading && !historyError && history.length === 0 && <p className="historyEmpty">還沒有保存的紀錄。登入後完成一次塔羅、星座或解夢，就會出現在這裡。</p>}
            {!historyLoading && history.length > 0 && (
              <div className="historyList">
                {history.map((item) => {
                  const isAstrology = item.kind === "astrology";
                  const isDream = item.kind === "dream";
                  const title = isAstrology ? `${item.signNameZhTw} · ${item.periodLabel}` : isDream ? item.title : item.question;
                  const category = isAstrology ? `星座 · ${item.signNameZhTw}` : isDream ? "解夢" : `塔羅 · ${item.spreadNameZhTw}`;
                  const meta = isAstrology
                    ? `${item.periodLabel} · ${item.localDate}`
                    : isDream
                      ? `${item.themeCount || 0} 個夢境主題`
                      : `${item.cardCount} 張牌${item.followUpCount ? ` · ${item.followUpCount} 次追問` : ""}`;
                  return (
                    <article className="historyItem" key={`${item.kind}-${item.readingId}`}>
                      <button className="historyOpenButton" type="button" onClick={() => openHistoryItem(item)} disabled={busyReadingId === item.readingId}>
                        <small>{formatHistoryDate(item.updatedAt)} · {category}</small>
                        <strong>{title}</strong>
                        <span>{item.overview}</span>
                        <em>{meta}</em>
                      </button>
                      <button className="historyDeleteButton" type="button" onClick={() => deleteHistoryItem(item)} disabled={busyReadingId === item.readingId} aria-label={`刪除：${title}`}>刪除</button>
                    </article>
                  );
                })}
              </div>
            )}
            {history.length > 0 && <button className="clearHistoryButton" type="button" onClick={clearHistory} disabled={historyLoading}>清除全部紀錄</button>}
          </section>
        </div>
      )}
    </>,
    document.body,
  ) : null;

  return (
    <>
      {accountPortal}
      {client && activeEntry && !user && (
        <aside className="saveReadingPrompt">
          <div>
            <strong>{savePromptTitle}</strong>
            <span>登入後會保存這次 Vela 解讀，之後可以跨裝置回來看。</span>
          </div>
          <button className="ghostButton" type="button" onClick={() => { setAuthMode("signin"); setAuthMessage(""); setAuthOpen(true); }}>登入以保存</button>
        </aside>
      )}
    </>
  );
}
