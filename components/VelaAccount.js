"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseBrowser } from "../lib/supabase-browser.js";

function translateAuthError(error) {
  const message = String(error?.message || "").toLowerCase();
  if (message.includes("invalid login credentials")) return "Email 或密碼不正確。";
  if (message.includes("email not confirmed")) return "請先到信箱完成 Email 驗證。";
  if (message.includes("user already registered")) return "這個 Email 已經註冊過了。";
  if (message.includes("password should be")) return "密碼至少需要 8 個字元。";
  if (message.includes("rate limit")) return "操作太頻繁，請稍後再試。";
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

export default function VelaAccount({ activeReading, onRestoreReading }) {
  const client = useMemo(() => getSupabaseBrowser(), []);
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(() => !client);
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
  const [saveState, setSaveState] = useState("idle");
  const [busyReadingId, setBusyReadingId] = useState("");
  const lastSavedFingerprint = useRef("");

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
    if (!client || !user || !activeReading) return undefined;
    const fingerprint = JSON.stringify({
      readingId: activeReading.readingId,
      followUps: activeReading.followUps,
    });
    if (fingerprint === lastSavedFingerprint.current) return undefined;

    const timer = window.setTimeout(async () => {
      setSaveState("saving");
      try {
        const response = await authorizedFetch(client, "/api/readings/history", {
          method: "POST",
          body: JSON.stringify(activeReading),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "目前無法保存這次占卜。");
        lastSavedFingerprint.current = fingerprint;
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    }, 450);

    return () => window.clearTimeout(timer);
  }, [client, user, activeReading]);

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
          setAuthMessage("註冊完成，這次占卜會自動保存。");
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
        const { error } = await client.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        setAuthMessage(activeReading ? "登入成功，正在保存這次占卜。" : "登入成功。");
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
      const { error } = await client.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin,
      });
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
    try {
      const response = await authorizedFetch(client, "/api/readings/history");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "目前無法載入占卜紀錄。");
      setHistory(data.readings || []);
    } catch (error) {
      setHistoryError(error.message || "目前無法載入占卜紀錄。");
    } finally {
      setHistoryLoading(false);
    }
  }

  async function openHistoryReading(readingId) {
    setBusyReadingId(readingId);
    setHistoryError("");
    try {
      const response = await authorizedFetch(client, `/api/readings/history/${readingId}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "目前無法開啟這次占卜。");
      onRestoreReading(data.reading);
      lastSavedFingerprint.current = JSON.stringify({
        readingId: data.reading.readingId,
        followUps: data.reading.followUps,
      });
      setHistoryOpen(false);
    } catch (error) {
      setHistoryError(error.message || "目前無法開啟這次占卜。");
    } finally {
      setBusyReadingId("");
    }
  }

  async function deleteHistoryReading(readingId) {
    if (!window.confirm("要永久刪除這次占卜與全部追問嗎？")) return;
    setBusyReadingId(readingId);
    setHistoryError("");
    try {
      const response = await authorizedFetch(client, `/api/readings/history/${readingId}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "目前無法刪除這次占卜。");
      setHistory((items) => items.filter((item) => item.readingId !== readingId));
    } catch (error) {
      setHistoryError(error.message || "目前無法刪除這次占卜。");
    } finally {
      setBusyReadingId("");
    }
  }

  async function clearHistory() {
    if (!history.length || !window.confirm("要永久清除這個帳號的所有占卜紀錄嗎？此操作無法復原。")) return;
    setHistoryLoading(true);
    setHistoryError("");
    try {
      const response = await authorizedFetch(client, "/api/readings/history", { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "目前無法清除占卜紀錄。");
      setHistory([]);
    } catch (error) {
      setHistoryError(error.message || "目前無法清除占卜紀錄。");
    } finally {
      setHistoryLoading(false);
    }
  }

  async function signOut() {
    if (!client) return;
    await client.auth.signOut();
  }

  if (!authReady) return <div className="accountDock" aria-hidden="true" />;

  return (
    <>
      <div className="accountDock" aria-label="Vela 帳號">
        {!client ? (
          <span className="accountUnavailable">匿名模式</span>
        ) : user ? (
          <>
            {activeReading && <span className={`saveState is-${saveState}`}>{saveState === "saving" ? "保存中…" : saveState === "saved" ? "已保存" : saveState === "error" ? "尚未保存" : ""}</span>}
            <button type="button" onClick={loadHistory}>占卜紀錄</button>
            <button className="accountAvatar" type="button" onClick={signOut} title={`${user.email} · 點擊登出`} aria-label={`${user.email}，點擊登出`}>
              {String(user.email || "V").slice(0, 1).toUpperCase()}
            </button>
          </>
        ) : (
          <button type="button" onClick={() => { setAuthMode("signin"); setAuthMessage(""); setAuthOpen(true); }}>
            登入
          </button>
        )}
      </div>

      {client && activeReading && !user && (
        <aside className="saveReadingPrompt">
          <div><strong>想把這次牌面留下來嗎？</strong><span>登入後會連同 Vela 的解讀與追問一起保存，之後可跨裝置回來看。</span></div>
          <button className="ghostButton" type="button" onClick={() => { setAuthMode("signin"); setAuthMessage(""); setAuthOpen(true); }}>登入以保存</button>
        </aside>
      )}

      {authOpen && (
        <div className="accountOverlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setAuthOpen(false); }}>
          <section className="accountModal" role="dialog" aria-modal="true" aria-labelledby="account-title">
            <button className="accountClose" type="button" onClick={() => setAuthOpen(false)} aria-label="關閉">×</button>
            <div className="eyebrow">VELA ACCOUNT</div>
            <h2 id="account-title">{authMode === "signup" ? "建立帳號" : authMode === "recovery" ? "設定新密碼" : "歡迎回來"}</h2>
            <p>{authMode === "recovery" ? "輸入新的密碼後即可回到 Vela。" : "登入不是占卜的門票，而是讓你能跨裝置保留值得回看的牌面。"}</p>
            <form onSubmit={submitAuth}>
              {authMode !== "recovery" && (
                <label>Email<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
              )}
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
              <div><div className="eyebrow">YOUR READINGS</div><h2 id="history-title">占卜紀錄</h2></div>
              <button className="accountClose" type="button" onClick={() => setHistoryOpen(false)} aria-label="關閉">×</button>
            </div>
            <p className="historyPrivacy">只保存你登入後選擇保留的牌面；新占卜不會自動讀取舊紀錄。紀錄會在最後一次保存 365 天後到期，你也可以隨時刪除。</p>
            {historyLoading && <p className="historyEmpty">正在整理你的牌面…</p>}
            {historyError && <div className="accountMessage isError" role="alert">{historyError}</div>}
            {!historyLoading && !historyError && history.length === 0 && <p className="historyEmpty">還沒有保存的占卜。登入後完成一次解讀，就會出現在這裡。</p>}
            {!historyLoading && history.length > 0 && (
              <div className="historyList">
                {history.map((item) => (
                  <article className="historyItem" key={item.readingId}>
                    <button className="historyOpenButton" type="button" onClick={() => openHistoryReading(item.readingId)} disabled={busyReadingId === item.readingId}>
                      <small>{formatHistoryDate(item.updatedAt)} · {item.spreadNameZhTw}</small>
                      <strong>{item.question}</strong>
                      <span>{item.overview}</span>
                      <em>{item.cardCount} 張牌{item.followUpCount ? ` · ${item.followUpCount} 次追問` : ""}</em>
                    </button>
                    <button className="historyDeleteButton" type="button" onClick={() => deleteHistoryReading(item.readingId)} disabled={busyReadingId === item.readingId} aria-label={`刪除：${item.question}`}>刪除</button>
                  </article>
                ))}
              </div>
            )}
            {history.length > 0 && <button className="clearHistoryButton" type="button" onClick={clearHistory} disabled={historyLoading}>清除全部紀錄</button>}
          </section>
        </div>
      )}
    </>
  );
}
