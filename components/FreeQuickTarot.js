"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseBrowser } from "../lib/supabase-browser.js";
import { buildTarotSharePng, shareTarotPng } from "../lib/tarot-share-card.js";
import VelaAccount from "./VelaAccount.js";
import VelaFlipPage from "./VelaFlipPage.js";

export const FREE_QUESTION_PRESETS = [
  "今天的我最需要注意什麼？",
  "最近的感情有什麼提醒？",
  "工作／學業現在最值得留意什麼？",
  "我現在最容易忽略什麼？",
  "接下來幾天，我該把注意力放在哪裡？",
  "現在的我最需要聽見什麼？",
];

const SPREAD_ID = "single-guidance";
const DAILY_LIMIT = 3;
const ANONYMOUS_LIMIT = 1;
const SELECTION_POOL_SIZE = 12;
const CARD_BACK = "/images/vela/tarot-card-back.webp";
const ANON_TRIAL_KEY = "askvela.free-quick.anonymous-trial.v1";
const DAILY_PREFIX = "askvela.free-quick.daily.v1";
const ORIENTATION_LABELS = { upright: "正位", reversed: "逆位" };
const RANK_NUMBER = { ace: "01", two: "02", three: "03", four: "04", five: "05", six: "06", seven: "07", eight: "08", nine: "09", ten: "10", page: "11", knight: "12", queen: "13", king: "14" };

const WAITING_LINES = [
  "我先看看，這張牌最先想提醒你什麼。",
  "我把這張牌放回你剛剛的問題裡。",
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
  return `/images/tarot/${card.suit}/${RANK_NUMBER[rank]}-${rank === "ace" ? "ace" : rank}-of-${card.suit}.webp`;
}

export default function FreeQuickTarot({
  initialQuestion = "",
  onOpenPlans,
  onQuotaExhausted,
  onReturnHome,
}) {
  const client = useMemo(() => getSupabaseBrowser(), []);
  const interpretationPromiseRef = useRef(null);
  const usageAtStartRef = useRef(0);
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(() => !client);
  const [question, setQuestion] = useState(String(initialQuestion || "").trim().slice(0, 500));
  const [stage, setStage] = useState(initialQuestion ? "select" : "question");
  const [pendingIndex, setPendingIndex] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [requestId, setRequestId] = useState("");
  const [draw, setDraw] = useState(null);
  const [result, setResult] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [waitingIndex, setWaitingIndex] = useState(0);
  const [usage, setUsage] = useState(() => {
    if (client || typeof window === "undefined") return 0;
    try { return window.localStorage.getItem(ANON_TRIAL_KEY) === "1" ? 1 : 0; } catch { return 0; }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [shareNotice, setShareNotice] = useState("");
  const [shareLoading, setShareLoading] = useState(false);

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

  function clearReadingState() {
    setPendingIndex(null);
    setSelectedIndex(null);
    setRequestId("");
    setDraw(null);
    setResult(null);
    setRevealed(false);
    setWaitingIndex(0);
    interpretationPromiseRef.current = null;
  }

  function beginQuestion(nextQuestion = question) {
    if (remaining <= 0) return;
    const text = String(nextQuestion || "").trim();
    if (text.length < 8 || text.length > 500) {
      setError("再多說一點點，Vela 才能看清楚你真正想問的地方。");
      return;
    }
    setQuestion(text);
    setError("");
    clearReadingState();
    setStage("select");
  }

  function createInterpretationPromise(drawData, nextRequestId, index) {
    const promise = (async () => {
      try {
        const response = await fetch("/api/readings/interpret", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Idempotency-Key": nextRequestId },
          body: JSON.stringify({
            question: question.trim(),
            spreadId: SPREAD_ID,
            requestId: nextRequestId,
            readingId: drawData.readingId,
            selectedCardIndexes: [index],
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

  function selectCard(index) {
    if (loading) return;
    setPendingIndex(index);
  }

  function cancelCardSelection() {
    setPendingIndex(null);
  }

  async function confirmCardSelection() {
    if (pendingIndex === null || loading) return;
    const index = pendingIndex;
    setPendingIndex(null);
    await chooseCard(index);
  }

  async function chooseCard(index) {
    // Once selection is confirmed, quota cannot invalidate this active reading.
    if (loading) return;
    const nextRequestId = makeRequestId();
    usageAtStartRef.current = usage;
    interpretationPromiseRef.current = null;
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
      setRevealed(false);

      createInterpretationPromise(data, nextRequestId, index);
      setStage("reveal");
    } catch (err) {
      setError(err.message || "目前無法完成抽牌。");
      setSelectedIndex(null);
      setRequestId("");
      setStage("select");
    } finally {
      setLoading(false);
    }
  }

  async function revealAndInterpret() {
    if (!draw || revealed) return;

    setRevealed(true);
    setError("");
    await sleep(1050);
    setWaitingIndex(0);
    setStage("interpreting");

    const waitingStartedAt = Date.now();
    const pending = interpretationPromiseRef.current || createInterpretationPromise(draw, requestId, selectedIndex);
    const outcome = await pending;

    const waitingElapsed = Date.now() - waitingStartedAt;
    await sleep(Math.max(0, 900 - waitingElapsed));

    if (!outcome.ok) {
      setError(outcome.error || "目前無法完成解讀。");
      setRevealed(false);
      interpretationPromiseRef.current = null;
      setStage("reveal");
      return;
    }

    setResult(outcome.data);
    saveUsage(Math.max(usageAtStartRef.current, usage) + 1);
    setStage("result");
  }

  function askAnother() {
    if (remaining <= 0) {
      onQuotaExhausted?.();
      return;
    }
    if (onReturnHome) {
      onReturnHome();
      return;
    }
    setQuestion("");
    clearReadingState();
    setError("");
    setShareNotice("");
    setStage("question");
  }

  async function shareResult() {
    if (!card || !result || shareLoading) return;
    setShareLoading(true);
    setShareNotice("");

    try {
      const overview = result.synthesis?.overview || card.contextInterpretation || "這張牌先提醒你一件事。";
      const blob = await buildTarotSharePng({
        question: question.trim(),
        cardName: card.nameZhTw || "塔羅牌",
        orientation: ORIENTATION_LABELS[card.orientation] || "",
        overview,
        imageSrc: tarotImagePath(card),
        reversed: card.orientation === "reversed",
      });
      const outcome = await shareTarotPng(blob);
      if (outcome === "downloaded") setShareNotice("已產生 PNG 結果卡。你的裝置不支援直接分享圖片，因此改為下載圖片。");
    } catch (err) {
      if (err?.name !== "AbortError") setShareNotice(err.message || "目前無法產生分享圖片，請稍後再試。");
    } finally {
      setShareLoading(false);
    }
  }

  const quotaLine = !authReady
    ? "正在確認今天的體驗次數…"
    : user
      ? `Vela 今天還能回答你 ${remaining} 個問題 ✦`
      : usage === 0
        ? "第一次來？這一題不用登入。"
        : "這次試問已完成；登入後今天還能繼續體驗。";

  const cardOrientation = ORIENTATION_LABELS[card?.orientation] || "";
  const cardFaceClass = card?.orientation === "reversed" ? "isReversed" : "";

  return (
    <section className={`quickTarotExperience immersiveQuickTarot stage-${stage}`}>
      <VelaAccount activeReading={activeReading} experience="tarot" />
      <button className="velaPlusStoreButton" type="button" onClick={onOpenPlans}>✦ Vela+</button>

      <div className="quickTarotShell">
        <div className="quickTarotEyebrow">FREE · ONE CARD</div>

        {stage === "question" && (
          <VelaFlipPage pageKey="quick-question" step={1} total={5} label="說說你的問題">
            <div className="quickQuestionCard velaFlipContentCard immersiveQuestionCard">
              <h1>{remaining > 0 ? "先把問題說給 Vela 聽。" : "今天先看到這裡。"}</h1>
              <p>{quotaLine}</p>
              {remaining > 0 ? (
                <button className="primaryButton" type="button" onClick={onReturnHome}>回到提問</button>
              ) : (
                <button className="ghostButton" type="button" onClick={onOpenPlans}>查看方案</button>
              )}
            </div>
          </VelaFlipPage>
        )}

        {stage === "select" && (
          <VelaFlipPage pageKey="quick-select" step={2} total={5} label="選一張牌">
            <div className="quickSelectionStage velaFlipContentCard immersiveSelectionStage">
              <div className="immersiveStageCopy">
                <h1>從牌桌上選一張。</h1>
                <p>先選中，再確認。剛剛如果只是誤觸，還可以換。</p>
              </div>
              <div className="quickCardPool immersiveCardPool" aria-label="選擇一張塔羅牌">
                {Array.from({ length: SELECTION_POOL_SIZE }, (_, index) => (
                  <button
                    key={index}
                    type="button"
                    className={`quickCardBack immersiveCardBack ${pendingIndex === index ? "isPendingConfirm" : ""}`}
                    style={{ "--card-index": index }}
                    onClick={() => selectCard(index)}
                    disabled={loading}
                    aria-pressed={pendingIndex === index}
                    aria-label={`選擇第 ${index + 1} 張牌`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={CARD_BACK} alt="" draggable="false" />
                  </button>
                ))}
              </div>

              {pendingIndex !== null && (
                <div className="freeTarotConfirmLayer" role="dialog" aria-modal="true" aria-labelledby="free-tarot-confirm-title">
                  <div className="freeTarotConfirmCard">
                    <span className="freeTarotConfirmEyebrow">CARD SELECTED</span>
                    <h2 id="free-tarot-confirm-title">確定選這張嗎？</h2>
                    <p>現在還沒有翻開。如果剛剛只是誤觸，可以再換一張。</p>
                    <div className="freeTarotConfirmActions">
                      <button type="button" className="ghostButton" onClick={cancelCardSelection}>換一張</button>
                      <button type="button" className="primaryButton" onClick={confirmCardSelection}>就是這張</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </VelaFlipPage>
        )}

        {stage === "drawing" && (
          <VelaFlipPage pageKey="quick-drawing" step={2} total={5} label="準備翻牌">
            <div className="immersiveDrawingStage isPreparingReveal" aria-live="polite">
              <div className="immersiveChosenBack isResting" aria-hidden="true">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={CARD_BACK} alt="" />
              </div>
              <span className="immersivePreparingLabel">牌面準備中…</span>
            </div>
          </VelaFlipPage>
        )}

        {stage === "reveal" && card && (
          <VelaFlipPage pageKey="quick-reveal" step={3} total={5} label="翻開這張牌">
            <div className="immersiveRevealStage">
              <div className="immersiveStageCopy">
                <h1>{revealed ? "你抽到這張。" : "牌已經在桌上。"}</h1>
                <p>{revealed ? `${card.nameZhTw}・${cardOrientation}` : "點一下牌，親手把它翻開。"}</p>
              </div>

              <button
                className={`immersiveRevealCard ${revealed ? "isFlipped" : ""}`}
                type="button"
                onClick={revealAndInterpret}
                disabled={revealed}
                aria-label={revealed ? `${card.nameZhTw}，${cardOrientation}` : "翻開這張塔羅牌"}
              >
                <span className="immersiveCardInner">
                  <span className="immersiveCardFace immersiveCardBackFace">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={CARD_BACK} alt="" draggable="false" />
                  </span>
                  <span className={`immersiveCardFace immersiveCardFrontFace ${cardFaceClass}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={tarotImagePath(card)} alt={`${card.nameZhTw}（${cardOrientation}）`} draggable="false" />
                  </span>
                </span>
              </button>

              {!revealed && <button className="primaryButton immersiveRevealButton" type="button" onClick={revealAndInterpret}>翻牌</button>}
              {revealed && <div className="immersiveRevealName" aria-live="polite"><strong>{card.nameZhTw}</strong><span>{cardOrientation}</span></div>}
            </div>
          </VelaFlipPage>
        )}

        {stage === "interpreting" && card && (
          <VelaFlipPage pageKey="quick-interpreting" step={4} total={5} label="Vela 正在看這張牌">
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

        {stage === "result" && result && card && (
          <VelaFlipPage pageKey="quick-result" step={5} total={5} label="這次的訊息">
            <article className="immersiveResultCard">
              <header className="immersiveResultHeader">
                <div className={`immersiveResultCardImage ${cardFaceClass}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={tarotImagePath(card)} alt={`${card.nameZhTw}（${cardOrientation}）`} />
                </div>
                <div className="immersiveResultIdentity">
                  <span>你抽到</span>
                  <h1>{card.nameZhTw}</h1>
                  <p>{cardOrientation}</p>
                </div>
              </header>

              <div className="immersiveResultScroll">
                <div className="quickResultQuestion">你問：{question.trim()}</div>
                <section className="quickResultReading">
                  <h2>{result.synthesis?.overview || "這張牌先提醒你一件事。"}</h2>
                  {result.synthesis?.narrative && <p>{result.synthesis.narrative}</p>}
                  {card.contextInterpretation && <p>{card.contextInterpretation}</p>}
                  {card.practicalFocus && (
                    <div className="quickPracticalFocus">
                      <strong>接下來先留意</strong>
                      <span>{card.practicalFocus}</span>
                    </div>
                  )}
                  {result.synthesis?.reflectionQuestions?.[0] && <blockquote>{result.synthesis.reflectionQuestions[0]}</blockquote>}
                </section>

                <aside className="quickUpgradeCard immersiveUpgradeCard">
                  <span>深度解析</span>
                  <h3>想把這件事看得更完整嗎？</h3>
                  <p>剛才這一張已經完整回答。深度解析會再從三個位置拆開來看，逐張解析，最後整理成一個整體結論。</p>
                  <button className="ghostButton" type="button" onClick={onOpenPlans}>深度解析</button>
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
      </div>
    </section>
  );
}
