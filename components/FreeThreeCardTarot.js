"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseBrowser } from "../lib/supabase-browser.js";
import { buildTarotSharePng, shareTarotPng } from "../lib/tarot-share-card.js";
import VelaAccount from "./VelaAccount.js";
import VelaFlipPage from "./VelaFlipPage.js";

const CARD_BACK = "/images/vela/tarot-card-back.webp";
const SELECTION_POOL_SIZE = 12;
const FALLBACK_SPREAD_ID = "situation-obstacle-advice";
const PENDING_DEEP_TRIAL_KEY = "askvela.pending-deep-trial.v1";
const ANON_TRIAL_KEY = "askvela.free-quick.anonymous-trial.v1";
const DAILY_PREFIX = "askvela.free-quick.daily.v1";
const DAILY_LIMIT = 3;
const ANONYMOUS_LIMIT = 1;
const ORIENTATION_LABELS = { upright: "正位", reversed: "逆位" };
const RANK_NUMBER = { ace: "01", two: "02", three: "03", four: "04", five: "05", six: "06", seven: "07", eight: "08", nine: "09", ten: "10", page: "11", knight: "12", queen: "13", king: "14" };
const WAITING_LINES = [
  "先看第一張，它已經足夠回答你現在最需要知道的地方。",
  "我把這張牌放回你剛剛真正想問的事情裡。",
  "牌義只是起點，我在看它和你的問題碰到哪裡。",
  "再一下，我把最值得你帶走的那一句留下來。",
];

function makeRequestId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `free-three-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
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

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
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
  if (!card.suit || !rank || !RANK_NUMBER[rank]) return "";
  return `/images/tarot/${card.suit}/${RANK_NUMBER[rank]}-${rank === "ace" ? "ace" : rank}-of-${card.suit}.webp`;
}

function fallbackPlan(question) {
  return {
    readingTitle: "這次的問題",
    spreadId: FALLBACK_SPREAD_ID,
    clarifyingQuestion: "你現在最想先看清楚哪一塊？",
    velaLine: "",
    options: [{
      id: "guided-free",
      label: "這次的問題",
      focusQuestion: question,
      readingQuestion: question,
      lenses: [
        { label: "現況", purpose: "先看這件事現在真正呈現的狀態。" },
        { label: "阻礙", purpose: "再看目前最容易卡住你的地方。" },
        { label: "建議", purpose: "最後看接下來最值得確認的方向。" },
      ],
    }],
  };
}

function resolvePlan(question, deepSeed) {
  const plan = deepSeed?.plan?.spreadId ? deepSeed.plan : fallbackPlan(question);
  const selectedOption = plan.options?.find((option) => option.id === deepSeed?.selectedOptionId)
    || plan.options?.[0]
    || fallbackPlan(question).options[0];
  return { plan, selectedOption };
}

function openAccountLogin() {
  const buttons = Array.from(document.querySelectorAll(".accountDock button"));
  const loginButton = buttons.find((button) => button.textContent?.trim() === "登入");
  loginButton?.click();
  return Boolean(loginButton);
}

export default function FreeThreeCardTarot({
  initialQuestion = "",
  deepSeed = null,
  trialUsed = false,
  onStartDeepTrial,
  onOpenPlans,
  onQuotaExhausted,
  onReturnHome,
}) {
  const client = useMemo(() => getSupabaseBrowser(), []);
  const interpretationPromiseRef = useRef(null);
  const usageAtStartRef = useRef(0);
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(() => !client);
  const [question] = useState(String(initialQuestion || "").trim().slice(0, 500));
  const [stage, setStage] = useState("select");
  const [selectedIndexes, setSelectedIndexes] = useState([]);
  const [requestId, setRequestId] = useState("");
  const [draw, setDraw] = useState(null);
  const [result, setResult] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [revealedIndexes, setRevealedIndexes] = useState([]);
  const [waitingIndex, setWaitingIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [shareNotice, setShareNotice] = useState("");
  const [shareLoading, setShareLoading] = useState(false);
  const [usage, setUsage] = useState(() => {
    if (client || typeof window === "undefined") return 0;
    try { return window.localStorage.getItem(ANON_TRIAL_KEY) === "1" ? 1 : 0; } catch { return 0; }
  });

  const { plan, selectedOption } = useMemo(() => resolvePlan(question, deepSeed), [question, deepSeed]);
  const spreadId = plan.spreadId || FALLBACK_SPREAD_ID;
  const readingQuestion = selectedOption?.readingQuestion || question;
  const limit = user ? DAILY_LIMIT : ANONYMOUS_LIMIT;
  const remaining = Math.max(0, limit - usage);
  const card = draw?.cards?.[0] || null;
  const interpretedCard = result?.cards?.[0] || null;
  const cardOrientation = ORIENTATION_LABELS[card?.orientation] || "";
  const cardFaceClass = card?.orientation === "reversed" ? "isReversed" : "";

  const trialSeed = useMemo(() => {
    if (!draw || !result || !requestId || selectedIndexes.length !== 3) return null;
    return {
      version: 1,
      question,
      readingQuestion,
      plan,
      selectedOptionId: selectedOption.id,
      selectedIndexes,
      revealedIndexes,
      requestId,
      draw,
      previewResult: result,
    };
  }, [draw, plan, question, readingQuestion, requestId, result, revealedIndexes, selectedIndexes, selectedOption]);

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

  useEffect(() => {
    if (stage !== "interpreting") return undefined;
    const timer = window.setInterval(() => {
      setWaitingIndex((current) => (current + 1) % WAITING_LINES.length);
    }, 3600);
    return () => window.clearInterval(timer);
  }, [stage]);

  function saveUsage(nextUsage) {
    const safeUsage = Math.min(limit, Math.max(0, nextUsage));
    setUsage(safeUsage);
    try {
      if (user?.id) window.localStorage.setItem(usageKey(user.id), String(safeUsage));
      else window.localStorage.setItem(ANON_TRIAL_KEY, safeUsage > 0 ? "1" : "0");
    } catch { /* ignore */ }
    return safeUsage;
  }

  function toggleCard(index) {
    if (loading) return;
    setSelectedIndexes((current) => {
      if (current.includes(index)) return current.filter((item) => item !== index);
      if (current.length >= 3) return current;
      return [...current, index];
    });
  }

  function createPreviewPromise(drawData, nextRequestId) {
    const promise = (async () => {
      try {
        const response = await fetch("/api/readings/interpret", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Idempotency-Key": nextRequestId },
          body: JSON.stringify({
            question: readingQuestion,
            spreadId,
            requestId: nextRequestId,
            readingId: drawData.readingId,
            selectedCardIndexes: selectedIndexes,
            previewCardCount: 1,
          }),
        });
        const data = await response.json();
        if (!response.ok) return { ok: false, error: data.error || "目前無法完成解讀。" };
        return { ok: true, data };
      } catch (err) {
        return { ok: false, error: err.message || "目前無法完成解讀。" };
      }
    })();
    interpretationPromiseRef.current = promise;
    return promise;
  }

  async function confirmThreeCards() {
    if (selectedIndexes.length !== 3 || loading) return;
    const nextRequestId = makeRequestId();
    usageAtStartRef.current = usage;
    setRequestId(nextRequestId);
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/readings/draw", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": nextRequestId },
        body: JSON.stringify({
          question: readingQuestion,
          spreadId,
          requestId: nextRequestId,
          selectedCardIndexes: selectedIndexes,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "目前無法完成抽牌。");
      setDraw(data);
      setRevealed(false);
      setRevealedIndexes([]);
      createPreviewPromise(data, nextRequestId);
      setStage("reveal");
    } catch (err) {
      setError(err.message || "目前無法完成抽牌。");
      setRequestId("");
    } finally {
      setLoading(false);
    }
  }

  async function revealAndInterpret(index) {
    if (!draw || revealed || revealedIndexes.includes(index)) return;
    if (index !== revealedIndexes.length) return;

    const nextRevealed = [...revealedIndexes, index];
    setRevealedIndexes(nextRevealed);
    setError("");

    if (nextRevealed.length < draw.cards.length) return;

    setRevealed(true);
    await sleep(900);
    setWaitingIndex(0);
    setStage("interpreting");

    const pending = interpretationPromiseRef.current || createPreviewPromise(draw, requestId);
    const outcome = await pending;
    await sleep(700);

    if (!outcome.ok) {
      setError(outcome.error || "目前無法完成解讀。");
      setRevealed(false);
      setRevealedIndexes([]);
      interpretationPromiseRef.current = null;
      setStage("reveal");
      return;
    }

    setResult(outcome.data);
    saveUsage(Math.max(usageAtStartRef.current, usage) + 1);
    setStage("result");
  }

  function continueDeep() {
    if (!trialSeed) return;
    if (user) {
      if (trialUsed) {
        onOpenPlans?.();
        return;
      }
      onStartDeepTrial?.(trialSeed);
      return;
    }

    try { window.sessionStorage.setItem(PENDING_DEEP_TRIAL_KEY, JSON.stringify(trialSeed)); } catch { /* ignore */ }
    if (!openAccountLogin()) setError("請先從右上角登入，Vela 會保留剛才這三張牌。");
  }

  async function shareResult() {
    if (!card || !result || shareLoading) return;
    setShareLoading(true);
    setShareNotice("");
    try {
      const overview = result.synthesis?.overview || interpretedCard?.contextInterpretation || "這張牌先提醒你一件事。";
      const blob = await buildTarotSharePng({
        question: question.trim(),
        cardName: card.nameZhTw || "塔羅牌",
        orientation: cardOrientation,
        overview,
        imageSrc: tarotImagePath(card),
        reversed: card.orientation === "reversed",
      });
      const outcome = await shareTarotPng(blob);
      if (outcome === "downloaded") setShareNotice("已產生結果圖片。你的裝置不支援直接分享，因此改為下載圖片。");
    } catch (err) {
      if (err?.name !== "AbortError") setShareNotice(err.message || "目前無法產生分享圖片，請稍後再試。");
    } finally {
      setShareLoading(false);
    }
  }

  function askAnother() {
    if (remaining <= 0) {
      onQuotaExhausted?.();
      return;
    }
    onReturnHome?.();
  }

  if (!question) return null;

  return (
    <section className={`quickTarotExperience immersiveQuickTarot stage-${stage}`}>
      <VelaAccount experience="tarot" />
      <button className="velaPlusStoreButton" type="button" onClick={onOpenPlans}>方案</button>

      <div className="quickTarotShell">
        <div className="quickTarotEyebrow">FREE · THREE CARDS / ONE ANSWER</div>

        {stage === "select" && (
          <VelaFlipPage pageKey="free-three-select" step={2} total={5} label="選三張牌">
            <div className="deepReadingStep velaFlipContentCard deepSelectCard">
              <h1>選三張。</h1>
              <p>三張都先由你決定。免費先看第一張；另外兩張會替你留在桌上。</p>
              <div className="deepSelectionProgress">
                {selectedOption.lenses.map((lens, index) => (
                  <span key={lens.label} className={selectedIndexes[index] !== undefined ? "isReady" : ""}>{index + 1}. {lens.label}</span>
                ))}
              </div>
              <div className="deepCardPool" aria-label="選擇三張塔羅牌">
                {Array.from({ length: SELECTION_POOL_SIZE }, (_, index) => {
                  const order = selectedIndexes.indexOf(index);
                  return (
                    <button type="button" key={index} className={order >= 0 ? "isSelected" : ""} onClick={() => toggleCard(index)} aria-label={`第 ${index + 1} 張牌`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={CARD_BACK} alt="" draggable="false" />
                      {order >= 0 && <b>{order + 1}</b>}
                    </button>
                  );
                })}
              </div>
              <div className="deepReadingActions">
                <span>已選 {selectedIndexes.length}/3</span>
                <button className="primaryButton" type="button" disabled={selectedIndexes.length !== 3 || loading} onClick={confirmThreeCards}>
                  {loading ? "正在放好牌面…" : "就這三張"}
                </button>
              </div>
            </div>
          </VelaFlipPage>
        )}

        {stage === "reveal" && draw && card && (
          <VelaFlipPage pageKey="free-three-reveal" step={3} total={5} label="翻開三張牌">
            <div className="deepReadingStep velaFlipContentCard deepRevealCard">
              <div className="deepVelaLine">三張都在。照順序把它們翻開；免費解析會先從第一張開始。</div>
              <div className="deepRevealRow">
                {draw.cards.map((item, index) => {
                  const isRevealed = revealedIndexes.includes(index);
                  const canReveal = index === revealedIndexes.length && !isRevealed && !revealed;
                  const lens = selectedOption.lenses[index];
                  const orientation = ORIENTATION_LABELS[item.orientation] || item.orientation;
                  return (
                    <article key={item.cardId} className={isRevealed ? "isRevealed" : ""}>
                      <span>{lens.label}</span>
                      <button
                        type="button"
                        className={`deepRevealTap ${isRevealed ? "isRevealed" : ""}`}
                        onClick={() => revealAndInterpret(index)}
                        disabled={!canReveal}
                        aria-label={isRevealed ? `${item.nameZhTw}，${orientation}，已翻開` : canReveal ? `翻開「${lens.label}」` : `先翻前一張牌`}
                      >
                        <div className="deepRevealFlip">
                          <div className="deepRevealFlipInner">
                            <div className="deepRevealFace deepRevealBack">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={CARD_BACK} alt="" draggable="false" />
                            </div>
                            <div className={`deepRevealFace deepRevealFront ${item.orientation === "reversed" ? "isReversed" : ""}`}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={tarotImagePath(item)} alt={item.nameZhTw} draggable="false" />
                            </div>
                          </div>
                        </div>
                      </button>
                      <strong>{isRevealed ? item.nameZhTw : canReveal ? "點牌翻開" : "等前一張"}</strong>
                      {isRevealed && <small>{orientation}</small>}
                    </article>
                  );
                })}
              </div>
            </div>
          </VelaFlipPage>
        )}

        {stage === "interpreting" && card && (
          <VelaFlipPage pageKey="free-three-interpreting" step={4} total={5} label="Vela 正在看第一張">
            <div className="immersiveInterpretStage">
              <div className="immersiveInterpretCardWrap">
                <div className={`immersiveInterpretCard ${cardFaceClass}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={tarotImagePath(card)} alt={`${card.nameZhTw}（${cardOrientation}）`} />
                </div>
                <span className="immersiveCardHalo" aria-hidden="true" />
              </div>
              <div className="immersiveInterpretCopy" aria-live="polite">
                <span>{card.nameZhTw}・{cardOrientation}</span>
                <p key={waitingIndex}>{WAITING_LINES[waitingIndex]}</p>
              </div>
              <div className="immersiveThinProgress isReading" aria-hidden="true"><span /></div>
            </div>
          </VelaFlipPage>
        )}

        {stage === "result" && result && card && interpretedCard && (
          <VelaFlipPage pageKey="free-three-result" step={5} total={5} label="先看最重要的一張">
            <article className="immersiveResultCard">
              <header className="immersiveResultHeader">
                <div className={`immersiveResultCardImage ${cardFaceClass}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={tarotImagePath(card)} alt={`${card.nameZhTw}（${cardOrientation}）`} />
                </div>
                <div className="immersiveResultIdentity">
                  <span>{selectedOption.lenses[0]?.label || "第一個位置"}</span>
                  <h1>{card.nameZhTw}</h1>
                  <p>{cardOrientation}</p>
                </div>
              </header>

              <div className="immersiveResultScroll">
                <div className="quickResultQuestion">你問：{question}</div>
                <section className="quickResultReading">
                  <h2>{result.synthesis?.overview || "這張牌先提醒你一件事。"}</h2>
                  {result.synthesis?.narrative && <p>{result.synthesis.narrative}</p>}
                  {interpretedCard.contextInterpretation && <p>{interpretedCard.contextInterpretation}</p>}
                  {interpretedCard.practicalFocus && (
                    <div className="quickPracticalFocus"><strong>接下來先留意</strong><span>{interpretedCard.practicalFocus}</span></div>
                  )}
                  {result.synthesis?.reflectionQuestions?.[0] && <blockquote>{result.synthesis.reflectionQuestions[0]}</blockquote>}
                </section>

                <aside className="quickUpgradeCard immersiveUpgradeCard">
                  <span>{user && !trialUsed ? "第一次深度解析免費" : "深度解析"}</span>
                  <h3>另外兩張牌已經翻開，完整關係還沒解讀。</h3>
                  <div className="deepRevealRow" aria-label="另外兩張已翻開的牌">
                    {draw.cards.slice(1).map((item, index) => {
                      const orientation = ORIENTATION_LABELS[item.orientation] || item.orientation;
                      return (
                        <article key={item.cardId}>
                          <span>{selectedOption.lenses[index + 1]?.label}</span>
                          <div className={`deepRevealImage ${item.orientation === "reversed" ? "isReversed" : ""}`}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={tarotImagePath(item)} alt={item.nameZhTw} draggable="false" />
                          </div>
                          <strong>{item.nameZhTw}</strong>
                          <small>{orientation}</small>
                        </article>
                      );
                    })}
                  </div>
                  {!user && <p>登入後不用重新抽牌，也不用再翻一次。第一次完整深度解析會直接沿用這三張，補上第二、第三張與三牌結論。</p>}
                  {user && !trialUsed && <p>第一次完整深度解析免費。直接沿用剛才三張，補上第二、第三張與最後的三牌結論。</p>}
                  {user && trialUsed && <p>三張牌面都已經保留。需要時，可以把另外兩個位置和整體關係一起看完整。</p>}
                  <button className="ghostButton" type="button" onClick={continueDeep}>
                    {!user ? "登入，免費完成深度解析" : trialUsed ? "深度解析" : "免費完成深度解析"}
                  </button>
                </aside>
              </div>

              <footer className="immersiveResultActions">
                <button className="ghostButton" type="button" onClick={shareResult} disabled={shareLoading}>{shareLoading ? "準備分享中…" : "分享"}</button>
                {remaining > 0 ? (
                  <button className="primaryButton" type="button" onClick={askAnother}>再問一件事</button>
                ) : (
                  <button className="primaryButton" type="button" onClick={() => onQuotaExhausted?.()}>查看方案</button>
                )}
              </footer>
              {shareNotice && <p className="quickShareNotice" role="status">{shareNotice}</p>}
            </article>
          </VelaFlipPage>
        )}

        {error && <div className="quickTarotError immersiveError" role="alert">{error}</div>}
        {!authReady && <span className="srOnly">正在確認登入狀態</span>}
      </div>
    </section>
  );
}
