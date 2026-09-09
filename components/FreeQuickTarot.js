"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowser } from "../lib/supabase-browser.js";
import VelaAccount from "./VelaAccount.js";
import VelaWaitingStage from "./VelaWaitingStage.js";

const SPREAD_ID = "single-guidance";
const DAILY_LIMIT = 3;
const ANONYMOUS_LIMIT = 1;
const SELECTION_POOL_SIZE = 12;
const ANON_TRIAL_KEY = "askvela.free-quick.anonymous-trial.v1";
const DAILY_PREFIX = "askvela.free-quick.daily.v1";
const ORIENTATION_LABELS = { upright: "正位", reversed: "逆位" };
const RANK_NUMBER = { ace: "01", two: "02", three: "03", four: "04", five: "05", six: "06", seven: "07", eight: "08", nine: "09", ten: "10", page: "11", knight: "12", queen: "13", king: "14" };

const WAITING_LINES = [
  "我先看看，這張牌最先想提醒你什麼。",
  "我把這張牌放回你剛剛問的事情裡。",
  "有個地方比單看牌義更值得注意。",
  "再一下，我把最重要的地方講清楚。",
];

function makeRequestId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `quick-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function taipeiDateKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function usageKey(userId) {
  return `${DAILY_PREFIX}:${taipeiDateKey()}:${userId}`;
}

function readNumber(key) {
  try {
    return Math.max(0, Number.parseInt(window.localStorage.getItem(key) || "0", 10) || 0);
  } catch {
    return 0;
  }
}

function tarotImagePath(card) {
  if (!card) return "";
  if (card.arcana === "major") {
    const filename = card.cardId
      .replace(/^major-/, "")
      .replace(/-fool$/, "-the-fool")
      .replace(/-magician$/, "-the-magician")
      .replace(/-high-priestess$/, "-the-high-priestess")
      .replace(/-empress$/, "-the-empress")
      .replace(/-emperor$/, "-the-emperor")
      .replace(/-hierophant$/, "-the-hierophant")
      .replace(/-lovers$/, "-the-lovers")
      .replace(/-chariot$/, "-the-chariot")
      .replace(/-hermit$/, "-the-hermit")
      .replace(/-hanged-man$/, "-the-hanged-man")
      .replace(/-devil$/, "-the-devil")
      .replace(/-tower$/, "-the-tower")
      .replace(/-star$/, "-the-star")
      .replace(/-moon$/, "-the-moon")
      .replace(/-sun$/, "-the-sun")
      .replace(/-world$/, "-the-world");
    return `/images/tarot/major/${filename}.webp`;
  }
  const rank = card.numberOrRank;
  return `/images/tarot/${card.suit}/${RANK_NUMBER[rank]}-${rank === "ace" ? "ace" : rank}-of-${card.suit}.webp`;
}

export default function FreeQuickTarot({ initialQuestion = "", onBack, onOpenPlans, onQuotaExhausted }) {
  const client = useMemo(() => getSupabaseBrowser(), []);
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(() => !client);
  const [question, setQuestion] = useState(String(initialQuestion || "").trim().slice(0, 500));
  const [stage, setStage] = useState(initialQuestion ? "select" : "question");
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [requestId, setRequestId] = useState("");
  const [draw, setDraw] = useState(null);
  const [result, setResult] = useState(null);
  const [usage, setUsage] = useState(() => {
    if (client || typeof window === "undefined") return 0;
    try { return window.localStorage.getItem(ANON_TRIAL_KEY) === "1" ? 1 : 0; } catch { return 0; }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [shareNotice, setShareNotice] = useState("");

  const limit = user ? DAILY_LIMIT : ANONYMOUS_LIMIT;
  const remaining = Math.max(0, limit - usage);
  const card = draw?.cards?.[0] || result?.cards?.[0] || null;
  const activeReading = useMemo(() => {
    if (!draw || !result || !requestId) return null;
    return {
      kind: "tarot",
      readingId: draw.readingId,
      requestId,
      question: question.trim(),
      spreadId: SPREAD_ID,
      selectedCardIndexes: [selectedIndex],
      draw,
      result,
      followUps: [],
    };
  }, [draw, result, requestId, question, selectedIndex]);

  useEffect(() => {
    if (!client) return undefined;
    let mounted = true;

    function syncUsage(nextUser) {
      if (!mounted) return;
      if (nextUser?.id) {
        const key = usageKey(nextUser.id);
        let nextUsage = readNumber(key);
        try {
          if (window.localStorage.getItem(ANON_TRIAL_KEY) === "1" && nextUsage < 1) {
            nextUsage = 1;
            window.localStorage.setItem(key, "1");
          }
        } catch { /* ignore */ }
        setUsage(nextUsage);
      } else {
        try { setUsage(window.localStorage.getItem(ANON_TRIAL_KEY) === "1" ? 1 : 0); } catch { setUsage(0); }
      }
    }

    client.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const nextUser = data?.session?.user || null;
      setUser(nextUser);
      syncUsage(nextUser);
      setAuthReady(true);
    });

    const { data: subscription } = client.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      const nextUser = session?.user || null;
      setUser(nextUser);
      syncUsage(nextUser);
      setAuthReady(true);
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [client]);

  function saveUsage(nextUsage) {
    const safeUsage = Math.min(limit, Math.max(0, nextUsage));
    setUsage(safeUsage);
    try {
      if (user?.id) window.localStorage.setItem(usageKey(user.id), String(safeUsage));
      else window.localStorage.setItem(ANON_TRIAL_KEY, safeUsage > 0 ? "1" : "0");
    } catch { /* ignore */ }
    return safeUsage;
  }

  function beginQuestion(event) {
    event.preventDefault();
    if (!question.trim() || remaining <= 0) return;
    setError("");
    setSelectedIndex(null);
    setRequestId("");
    setDraw(null);
    setResult(null);
    setStage("select");
  }

  async function chooseCard(index) {
    if (loading || remaining <= 0) return;
    const nextRequestId = makeRequestId();
    setSelectedIndex(index);
    setRequestId(nextRequestId);
    setLoading(true);
    setError("");
    setStage("drawing");

    try {
      const response = await fetch("/api/readings/draw", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": nextRequestId },
        body: JSON.stringify({
          question: question.trim(),
          spreadId: SPREAD_ID,
          requestId: nextRequestId,
          selectedCardIndexes: [index],
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "目前無法完成抽牌。");
      setDraw(data);
      setStage("reveal");
    } catch (err) {
      setError(err.message || "目前無法完成抽牌。");
      setStage("select");
    } finally {
      setLoading(false);
    }
  }

  async function revealAndInterpret() {
    if (!draw || loading) return;
    setLoading(true);
    setError("");
    setStage("interpreting");
    try {
      const response = await fetch("/api/readings/interpret", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": requestId },
        body: JSON.stringify({
          question: question.trim(),
          spreadId: SPREAD_ID,
          requestId,
          readingId: draw.readingId,
          selectedCardIndexes: [selectedIndex],
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "目前無法完成解讀。");
      setResult(data);
      const nextUsage = saveUsage(usage + 1);
      setStage("result");
      if (user && nextUsage >= DAILY_LIMIT) {
        window.setTimeout(() => onQuotaExhausted?.(), 900);
      }
    } catch (err) {
      setError(err.message || "目前無法完成解讀。");
      setStage("reveal");
    } finally {
      setLoading(false);
    }
  }

  function askAnother() {
    if (remaining <= 0) return;
    setQuestion("");
    setSelectedIndex(null);
    setRequestId("");
    setDraw(null);
    setResult(null);
    setError("");
    setShareNotice("");
    setStage("question");
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }

  async function shareResult() {
    const overview = result?.synthesis?.overview || card?.contextInterpretation || "";
    const text = `我問 Vela：「${question.trim()}」\n抽到 ${card?.nameZhTw || "一張牌"}・${ORIENTATION_LABELS[card?.orientation] || ""}\n${overview}`.trim();
    try {
      if (navigator.share) await navigator.share({ title: "AskVela 塔羅", text });
      else {
        await navigator.clipboard.writeText(text);
        setShareNotice("已複製分享文字。");
      }
    } catch (err) {
      if (err?.name !== "AbortError") setShareNotice("目前無法分享，請稍後再試。");
    }
  }

  const quotaLine = !authReady
    ? "正在確認今天的提問次數…"
    : user
      ? `Vela 今天還能回答你 ${remaining} 個小問題 ✦`
      : usage === 0
        ? "第一次來？這一題不用登入。"
        : "這次試問已完成；登入後今天還能繼續問。";

  return (
    <section className="quickTarotExperience">
      <VelaAccount activeReading={activeReading} experience="tarot" />
      <button className="velaPlusStoreButton" type="button" onClick={onOpenPlans}>✦ Vela+</button>
      <button className="quickBackButton" type="button" onClick={onBack}>← 回到首頁</button>

      <div className="quickTarotShell">
        <div className="quickTarotEyebrow">FREE · ONE CARD</div>

        {stage === "question" && (
          <form className="quickQuestionCard" onSubmit={beginQuestion}>
            <h1>{remaining > 0 ? "今天想問 Vela 什麼？" : "今天先看到這裡。"}</h1>
            <p>{quotaLine}</p>
            <textarea
              rows={4}
              maxLength={500}
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="例如：我今天工作上最需要注意什麼？"
              disabled={remaining <= 0}
              autoFocus
            />
            <button className="primaryButton quickDrawButton" type="submit" disabled={!question.trim() || remaining <= 0}>抽一張牌 ✦</button>
            {remaining <= 0 && (
              <button className="ghostButton" type="button" onClick={onOpenPlans}>看看 Free 與 Vela+ 的差別</button>
            )}
          </form>
        )}

        {stage === "select" && (
          <div className="quickSelectionStage">
            <h1>從牌桌上選一張。</h1>
            <p>不用想哪張比較好。停在哪一張，就選哪一張。</p>
            <div className="quickCardPool" aria-label="選擇一張塔羅牌">
              {Array.from({ length: SELECTION_POOL_SIZE }, (_, index) => (
                <button key={index} type="button" className="quickCardBack" onClick={() => chooseCard(index)} aria-label={`選擇第 ${index + 1} 張牌`}>
                  <span>☾</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {stage === "drawing" && (
          <VelaWaitingStage lines={["我把你選的那張牌收回來洗一下。", "好，這張牌的位置固定了。"]} glyph="✦" />
        )}

        {stage === "reveal" && card && (
          <div className="quickRevealStage">
            <p>這張就是你剛剛選的牌。</p>
            <button className="quickRevealCard" type="button" onClick={revealAndInterpret} disabled={loading}>
              <span className="quickRevealBack">☾</span>
            </button>
            <button className="primaryButton" type="button" onClick={revealAndInterpret} disabled={loading}>翻牌</button>
          </div>
        )}

        {stage === "interpreting" && (
          <VelaWaitingStage lines={WAITING_LINES} glyph="☾" />
        )}

        {stage === "result" && result && card && (
          <article className="quickResultCard">
            <div className="quickResultQuestion">你問：{question.trim()}</div>
            <div className="quickResultHero">
              <div className={`quickResultCardImage ${card.orientation === "reversed" ? "isReversed" : ""}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={tarotImagePath(card)} alt={`${card.nameZhTw}（${ORIENTATION_LABELS[card.orientation]}）`} />
              </div>
              <div>
                <span>你抽到</span>
                <h1>{card.nameZhTw}</h1>
                <p>{ORIENTATION_LABELS[card.orientation]}</p>
              </div>
            </div>

            <section className="quickResultReading">
              <h2>{result.synthesis?.overview || "這張牌先提醒你一件事。"}</h2>
              {result.synthesis?.narrative && <p>{result.synthesis.narrative}</p>}
              {card.contextInterpretation && <p>{card.contextInterpretation}</p>}
              {card.practicalFocus && <div className="quickPracticalFocus"><strong>今天可以先留意</strong><span>{card.practicalFocus}</span></div>}
              {result.synthesis?.reflectionQuestions?.[0] && <blockquote>{result.synthesis.reflectionQuestions[0]}</blockquote>}
            </section>

            <div className="quickResultActions">
              <button className="ghostButton" type="button" onClick={shareResult}>分享這次結果</button>
              {remaining > 0 && <button className="primaryButton" type="button" onClick={askAnother}>再問一個小問題</button>}
            </div>
            {shareNotice && <p className="quickShareNotice" role="status">{shareNotice}</p>}

            <aside className="quickUpgradeCard">
              <span>✦ VELA+ DEEP READING</span>
              <h3>有一件事情，不是一張牌能說完的嗎？</h3>
              <p>Deep Reading 會先讓 Vela 理解你的情況，再決定要怎麼看；Free 不開放同一題自由追問。</p>
              <button className="ghostButton" type="button" onClick={onOpenPlans}>看看 Deep Reading</button>
            </aside>

            <p className="quickQuotaAfter">{quotaLine}</p>
          </article>
        )}

        {error && <div className="quickTarotError" role="alert">{error}</div>}
      </div>
    </section>
  );
}
