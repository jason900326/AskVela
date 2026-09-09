"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseBrowser } from "../lib/supabase-browser.js";
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
const VELA_TAROT_ART = "/images/vela/vela-tarot.webp";
const ANON_TRIAL_KEY = "askvela.free-quick.anonymous-trial.v1";
const DAILY_PREFIX = "askvela.free-quick.daily.v1";
const ORIENTATION_LABELS = { upright: "正位", reversed: "逆位" };
const RANK_NUMBER = { ace: "01", two: "02", three: "03", four: "04", five: "05", six: "06", seven: "07", eight: "08", nine: "09", ten: "10", page: "11", knight: "12", queen: "13", king: "14" };

const WAITING_LINES = [
  "我先看看，這張牌最先想提醒你什麼。",
  "我把這張牌放回你剛剛選的題目裡。",
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

export default function FreeQuickTarot({ initialQuestion = "", onOpenPlans, onQuotaExhausted }) {
  const client = useMemo(() => getSupabaseBrowser(), []);
  const interpretationPromiseRef = useRef(null);
  const usageAtStartRef = useRef(0);
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(() => !client);
  const [question, setQuestion] = useState(String(initialQuestion || "").trim().slice(0, 500));
  const [stage, setStage] = useState(initialQuestion ? "select" : "question");
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
  const [analysisLoading, setAnalysisLoading] = useState(false);
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
    setSelectedIndex(null);
    setRequestId("");
    setDraw(null);
    setResult(null);
    setRevealed(false);
    setWaitingIndex(0);
    setAnalysisLoading(false);
    interpretationPromiseRef.current = null;
  }

  function beginQuestion(nextQuestion = question) {
    if (remaining <= 0) return;
    const text = String(nextQuestion || "").trim();
    if (!FREE_QUESTION_PRESETS.includes(text)) {
      setError("Free 體驗請先從 Vela 準備的題目裡選一個。");
      return;
    }
    setQuestion(text);
    setError("");
    clearReadingState();
    setStage("select");
  }

  function createInterpretationPromise(drawData, nextRequestId, index) {
    setAnalysisLoading(true);
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
    promise.then(() => setAnalysisLoading(false));
    return promise;
  }

  async function chooseCard(index) {
    // Once the user has reached selection, never let a late auth/quota sync
    // invalidate the active reading. Quota gates the next reading, not this one.
    if (loading) return;
    const nextRequestId = makeRequestId();
    const drawingStartedAt = Date.now();
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

      // Keep the chosen-card ritual on screen long enough to feel intentional,
      // while using that time to prefetch the AI interpretation in parallel.
      const elapsed = Date.now() - drawingStartedAt;
      await sleep(Math.max(0, 1800 - elapsed));
      setStage("reveal");
    } catch (err) {
      setError(err.message || "目前無法完成抽牌。");
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

    // Even when prefetch finishes early, keep a short Vela beat after the flip so
    // the transition does not jump straight from card face to a wall of text.
    const waitingElapsed = Date.now() - waitingStartedAt;
    await sleep(Math.max(0, 1200 - waitingElapsed));

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
    setQuestion("");
    clearReadingState();
    setError("");
    setShareNotice("");
    setStage("question");
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
    ? "正在確認今天的體驗次數…"
    : user
      ? `Vela 今天還能回答你 ${remaining} 個預設問題 ✦`
      : usage === 0
        ? "第一次來？這一題不用登入。"
        : "這次試問已完成；登入後今天還能繼續體驗。";

  const cardOrientation = ORIENTATION_LABELS[card?.orientation] || "";
  const cardFaceClass = card?.orientation === "reversed" ? "isReversed" : "";

  const loginInvite = !user ? (
    <div className="immersiveLoginVela" aria-label="Vela 登入邀請">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={VELA_TAROT_ART} alt="" draggable="false" aria-hidden="true" />
      <div>
        <strong>想把這次解讀留下來嗎？</strong>
        <span>結果出來後，從右上角登入就能保存；現在先讓我把這張牌看完。</span>
      </div>
    </div>
  ) : null;

  return (
    <section className={`quickTarotExperience immersiveQuickTarot stage-${stage}`}>
      <VelaAccount activeReading={activeReading} experience="tarot" />
      <button className="velaPlusStoreButton" type="button" onClick={onOpenPlans}>✦ Vela+</button>

      <div className="quickTarotShell">
        <div className="quickTarotEyebrow">FREE · ONE CARD</div>

        {stage === "question" && (
          <VelaFlipPage pageKey="quick-question" step={1} total={5} label="選一個問題">
            <div className="quickQuestionCard velaFlipContentCard immersiveQuestionCard immersivePresetQuestionCard">
              <h1>{remaining > 0 ? "今天想讓 Vela 看哪一件小事？" : "今天先看到這裡。"}</h1>
              <p>{quotaLine}</p>

              {remaining > 0 ? (
                <div className="freePresetGrid" aria-label="Free 預設問題">
                  {FREE_QUESTION_PRESETS.map((item) => (
                    <button type="button" key={item} onClick={() => beginQuestion(item)}>{item}</button>
                  ))}
                </div>
              ) : (
                <button className="ghostButton" type="button" onClick={onOpenPlans}>看看 Free 與 Vela+ 的差別</button>
              )}

              <aside className="freeQuestionPlusHint">
                <span>✦ VELA+</span>
                <p>有自己的事情想問？Vela+ 可以自由描述問題，不需要從預設題目裡選。</p>
                <button className="ghostButton" type="button" onClick={onOpenPlans}>看看 Vela+</button>
              </aside>
            </div>
          </VelaFlipPage>
        )}

        {stage === "select" && (
          <VelaFlipPage pageKey="quick-select" step={2} total={5} label="選一張牌">
            <div className="quickSelectionStage velaFlipContentCard immersiveSelectionStage">
              <div className="immersiveStageCopy">
                <h1>從牌桌上選一張。</h1>
                <p>不用猜哪張比較好。停在哪一張，就選哪一張。</p>
              </div>
              <div className="quickCardPool immersiveCardPool" aria-label="選擇一張塔羅牌">
                {Array.from({ length: SELECTION_POOL_SIZE }, (_, index) => (
                  <button
                    key={index}
                    type="button"
                    className="quickCardBack immersiveCardBack"
                    style={{ "--card-index": index }}
                    onClick={() => chooseCard(index)}
                    disabled={loading}
                    aria-label={`選擇第 ${index + 1} 張牌`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={CARD_BACK} alt="" draggable="false" />
                  </button>
                ))}
              </div>
            </div>
          </VelaFlipPage>
        )}

        {stage === "drawing" && (
          <VelaFlipPage pageKey="quick-drawing" step={2} total={5} label="把這張牌帶出來">
            <div className="immersiveDrawingStage hasLoginInvite">
              <div className="immersiveChosenBack" aria-hidden="true">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={CARD_BACK} alt="" />
              </div>
              <div className="immersiveDrawingCopy">
                <strong>這張牌已經選定。</strong>
                <span>{analysisLoading ? "Vela 已經先開始看這張牌了。" : "我把它從牌堆裡帶出來。"}</span>
              </div>
              {loginInvite}
              <div className="immersiveThinProgress" aria-hidden="true"><span /></div>
            </div>
          </VelaFlipPage>
        )}

        {stage === "reveal" && card && (
          <VelaFlipPage pageKey="quick-reveal" step={3} total={5} label="翻開這張牌">
            <div className="immersiveRevealStage">
              <div className="immersiveStageCopy">
                <h1>{revealed ? "你抽到這張。" : "這張就是你剛剛選的牌。"}</h1>
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
              {!user && <small className="immersiveSaveHint">剛剛那個登入邀請還在右上角；不用急，我會先把解讀完成。</small>}
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
                <div className="quickResultQuestion">你選：{question.trim()}</div>
                <section className="quickResultReading">
                  <h2>{result.synthesis?.overview || "這張牌先提醒你一件事。"}</h2>
                  {result.synthesis?.narrative && <p>{result.synthesis.narrative}</p>}
                  {card.contextInterpretation && <p>{card.contextInterpretation}</p>}
                  {card.practicalFocus && (
                    <div className="quickPracticalFocus">
                      <strong>今天可以先留意</strong>
                      <span>{card.practicalFocus}</span>
                    </div>
                  )}
                  {result.synthesis?.reflectionQuestions?.[0] && <blockquote>{result.synthesis.reflectionQuestions[0]}</blockquote>}
                </section>

                <aside className="quickUpgradeCard immersiveUpgradeCard">
                  <span>✦ VELA+ DEEP READING</span>
                  <h3>有一件事情，不是一張牌能說完的嗎？</h3>
                  <p>Vela+ 可以直接問自己的問題；Vela 會先理解你的情況，再決定怎麼看。</p>
                  <button className="ghostButton" type="button" onClick={onOpenPlans}>看看 Deep Reading</button>
                </aside>
              </div>

              <footer className="immersiveResultActions">
                <button className="ghostButton" type="button" onClick={shareResult}>分享結果</button>
                {remaining > 0 ? (
                  <button className="primaryButton" type="button" onClick={askAnother}>再選一題</button>
                ) : (
                  <button className="primaryButton" type="button" onClick={() => onQuotaExhausted?.()}>看看 Vela+</button>
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
