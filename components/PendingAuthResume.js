"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getSupabaseBrowser } from "../lib/supabase-browser.js";

const PENDING_AUTH_KEY = "askvela.pending-auth-experience.v1";
const PENDING_ANALYSIS_KEY = "askvela.pending-analysis.v1";
const LAST_TAROT_DRAW_KEY = "askvela.pending-tarot-draw.v1";
const TAROT_SESSION_KEY = "askvela.current-reading.v2";
const ASTROLOGY_SESSION_KEY = "askvela.current-astrology.v1";
const DREAM_SESSION_KEY = "askvela.current-dream.v1";

function readJson(key) {
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeJson(key, value) {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Session persistence is best-effort; the live request can still finish normally.
  }
}

function requestMeta(input, init = {}) {
  const rawUrl = typeof input === "string" ? input : input?.url || "";
  let pathname = rawUrl;
  try { pathname = new URL(rawUrl, window.location.origin).pathname; } catch { /* ignore */ }
  const method = String(init?.method || input?.method || "GET").toUpperCase();
  let body = null;
  if (typeof init?.body === "string") {
    try { body = JSON.parse(init.body); } catch { /* ignore */ }
  }
  return { pathname, method, body };
}

function pendingModeForPath(pathname) {
  if (pathname === "/api/readings/interpret") return "tarot";
  if (pathname === "/api/astrology/reading") return "astrology";
  if (pathname === "/api/dreams/reading") return "dream";
  return "";
}

function idempotencyKey(init = {}, body = {}) {
  try {
    const headers = new Headers(init?.headers || {});
    return headers.get("Idempotency-Key") || body?.requestId || "";
  } catch {
    return body?.requestId || "";
  }
}

function inferExperienceFromDom() {
  if (document.querySelector(".tarotFinalResult, .readingExperience")) return "tarot";
  if (document.querySelector(".astrologyFinalResult, .astrologyExperience")) return "astrology";
  if (document.querySelector(".dreamFinalResult, .dreamReadingFlow")) return "dream";
  return "";
}

function completedSessionExists(mode) {
  const value = mode === "tarot"
    ? readJson(TAROT_SESSION_KEY)
    : mode === "astrology"
      ? readJson(ASTROLOGY_SESSION_KEY)
      : readJson(DREAM_SESSION_KEY);

  if (mode === "tarot") return Boolean(value?.version === 2 && value?.readingId && value?.draw && value?.result);
  if (mode === "astrology") return Boolean(value?.version === 1 && value?.kind === "astrology" && value?.readingId && value?.result);
  if (mode === "dream") return Boolean(value?.version === 1 && value?.reading?.kind === "dream" && value?.reading?.readingId);
  return false;
}

function promptCopy(mode) {
  if (mode === "astrology") {
    return {
      title: "我再看一下今天幾個位置的關係。",
      body: "要不要先登入？這次的星象解讀，我可以替你留著。",
      portrait: "/images/vela/vela-home-revealed.webp",
    };
  }
  if (mode === "dream") {
    return {
      title: "這個夢還有幾個地方我想再想一下。",
      body: "要不要先登入？這次的夢境解讀，我替你留著。",
      portrait: "/images/vela/vela-home-revealed.webp",
    };
  }
  return {
    title: "我還要把這幾張牌放在一起看。",
    body: "要不要先登入？這次的牌，我替你留著。",
    portrait: "/images/vela/vela-tarot.webp",
  };
}

function persistCompletedAnalysis(mode, body, data) {
  if (mode === "tarot") {
    const lastDraw = readJson(LAST_TAROT_DRAW_KEY);
    const draw = lastDraw?.data;
    if (!draw?.readingId || draw.readingId !== body?.readingId) return false;
    writeJson(TAROT_SESSION_KEY, {
      version: 2,
      kind: "tarot",
      readingId: draw.readingId,
      requestId: body?.requestId || lastDraw?.body?.requestId || "",
      question: body?.question || lastDraw?.body?.question || draw?.question || "",
      spreadId: body?.spreadId || lastDraw?.body?.spreadId || draw?.spread?.id || "",
      selectedCardIndexes: Array.isArray(body?.selectedCardIndexes)
        ? body.selectedCardIndexes
        : (lastDraw?.body?.selectedCardIndexes || []),
      draw,
      result: data,
      followUps: [],
    });
    return true;
  }

  if (mode === "astrology") {
    if (!data?.readingId || !data?.result) return false;
    writeJson(ASTROLOGY_SESSION_KEY, { version: 1, ...data });
    return true;
  }

  if (mode === "dream") {
    if (!data?.readingId || !data?.result) return false;
    writeJson(DREAM_SESSION_KEY, { version: 1, reading: data });
    return true;
  }

  return false;
}

export default function PendingAuthResume() {
  const client = useMemo(() => getSupabaseBrowser(), []);
  const nativeFetchRef = useRef(null);
  const [user, setUser] = useState(null);
  const [pendingAnalysis, setPendingAnalysis] = useState(() => {
    if (typeof window === "undefined") return null;
    return readJson(PENDING_ANALYSIS_KEY);
  });
  const [waitingTarget, setWaitingTarget] = useState(null);
  const [dismissedSignature, setDismissedSignature] = useState("");

  useEffect(() => {
    if (!client) return undefined;
    let mounted = true;
    client.auth.getSession().then(({ data }) => {
      if (mounted) setUser(data?.session?.user || null);
    });
    const { data: subscription } = client.auth.onAuthStateChange((_event, session) => {
      if (mounted) setUser(session?.user || null);
    });
    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [client]);

  /*
   * Keep a tiny, tab-local snapshot of an in-flight anonymous analysis.
   * If Google OAuth leaves the page, we can repeat the same idempotent request
   * and restore the exact result stage instead of dropping the user on home.
   */
  useEffect(() => {
    const originalFetch = window.fetch.bind(window);
    nativeFetchRef.current = originalFetch;

    window.fetch = async (input, init = {}) => {
      const meta = requestMeta(input, init);
      const isPost = meta.method === "POST";
      const mode = isPost ? pendingModeForPath(meta.pathname) : "";

      if (mode && meta.body) {
        const snapshot = {
          mode,
          pathname: meta.pathname,
          body: meta.body,
          idempotencyKey: idempotencyKey(init, meta.body),
          startedAt: Date.now(),
        };
        writeJson(PENDING_ANALYSIS_KEY, snapshot);
        setPendingAnalysis(snapshot);
        setDismissedSignature("");
      }

      const response = await originalFetch(input, init);

      if (isPost && meta.pathname === "/api/readings/draw" && response.ok) {
        try {
          const data = await response.clone().json();
          writeJson(LAST_TAROT_DRAW_KEY, { body: meta.body || {}, data, savedAt: Date.now() });
        } catch {
          // The live Tarot flow still owns the response; this cache is only for OAuth resume.
        }
      }

      if (mode && response.ok) {
        try {
          const data = await response.clone().json();
          persistCompletedAnalysis(mode, meta.body || {}, data);
          window.sessionStorage.removeItem(PENDING_ANALYSIS_KEY);
          setPendingAnalysis(null);
        } catch {
          // Do not disturb the live analysis if the clone cannot be read.
        }
      }

      return response;
    };

    return () => {
      window.fetch = originalFetch;
      nativeFetchRef.current = null;
    };
  }, []);

  useEffect(() => {
    function syncTarget() {
      if (!pendingAnalysis) {
        setWaitingTarget(null);
        return;
      }
      setWaitingTarget(document.querySelector(".velaWaitingStage .velaWaitingCard"));
    }

    syncTarget();
    const observer = new MutationObserver(syncTarget);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [pendingAnalysis]);

  useEffect(() => {
    function rememberGoogleReturn(event) {
      const target = event.target instanceof Element ? event.target.closest(".googleAuthButton") : null;
      if (!target) return;
      const mode = readJson(PENDING_ANALYSIS_KEY)?.mode || inferExperienceFromDom();
      if (mode) window.sessionStorage.setItem(PENDING_AUTH_KEY, mode);
    }
    document.addEventListener("click", rememberGoogleReturn, true);
    return () => document.removeEventListener("click", rememberGoogleReturn, true);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function resumeAfterOAuth() {
      const mode = window.sessionStorage.getItem(PENDING_AUTH_KEY);
      if (!mode || !["dream", "tarot", "astrology"].includes(mode)) return;

      const pending = readJson(PENDING_ANALYSIS_KEY);
      if (pending?.mode === mode && !completedSessionExists(mode)) {
        const originalFetch = nativeFetchRef.current || window.fetch.bind(window);
        const headers = { "Content-Type": "application/json" };
        if (pending.idempotencyKey) headers["Idempotency-Key"] = pending.idempotencyKey;

        try {
          let response = await originalFetch(pending.pathname, {
            method: "POST",
            headers,
            body: JSON.stringify(pending.body || {}),
            cache: "no-store",
          });

          if (!response.ok) {
            await new Promise((resolve) => window.setTimeout(resolve, 900));
            response = await originalFetch(pending.pathname, {
              method: "POST",
              headers,
              body: JSON.stringify(pending.body || {}),
              cache: "no-store",
            });
          }

          if (response.ok) {
            const data = await response.json();
            if (persistCompletedAnalysis(mode, pending.body || {}, data)) {
              window.sessionStorage.removeItem(PENDING_ANALYSIS_KEY);
              setPendingAnalysis(null);
            }
          }
        } catch {
          // Leave the pending request in sessionStorage so a refresh can retry it again.
        }
      }

      if (cancelled) return;
      window.sessionStorage.removeItem(PENDING_AUTH_KEY);
      window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent("vela:experience", { detail: mode }));
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      }, 120);
    }

    resumeAfterOAuth();
    return () => { cancelled = true; };
  }, []);

  function openExistingAuth() {
    const loginButton = Array.from(document.querySelectorAll(".accountDock button"))
      .find((button) => String(button.textContent || "").includes("登入"));
    if (loginButton) {
      loginButton.click();
      return;
    }
    window.setTimeout(() => {
      const retry = Array.from(document.querySelectorAll(".accountDock button"))
        .find((button) => String(button.textContent || "").includes("登入"));
      retry?.click();
    }, 80);
  }

  const signature = pendingAnalysis ? `${pendingAnalysis.mode}:${pendingAnalysis.startedAt}` : "";
  const showInvite = Boolean(
    waitingTarget
    && pendingAnalysis
    && !user
    && signature
    && dismissedSignature !== signature
  );

  if (!showInvite || !waitingTarget) return null;

  const copy = promptCopy(pendingAnalysis.mode);
  const isTarot = pendingAnalysis.mode === "tarot";

  return createPortal(
    <aside className={`waitingAuthInvite mode-${pendingAnalysis.mode}`} aria-label="登入並保存這次解讀">
      <div className="waitingAuthPortraitWrap" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={`waitingAuthPortrait ${isTarot ? "isTarot" : ""}`} src={copy.portrait} alt="" />
      </div>
      <div className="waitingAuthCopy">
        <strong>{copy.title}</strong>
        <span>{copy.body}</span>
      </div>
      <div className="waitingAuthActions">
        <button className="primaryButton" type="button" onClick={openExistingAuth}>登入並保存</button>
        <button className="waitingAuthSkip" type="button" onClick={() => setDismissedSignature(signature)}>等等再說</button>
      </div>
    </aside>,
    waitingTarget,
  );
}
