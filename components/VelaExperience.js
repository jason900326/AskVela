"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseBrowser } from "../lib/supabase-browser.js";
import AstrologyReadingFlowV2 from "./AstrologyReadingFlowV2.js";
import DreamReadingFlowV2 from "./DreamReadingFlowV2.js";
import FreeQuickTarot from "./FreeThreeCardTarot.js";
import VelaAccount from "./VelaAccount.js";
import VelaDeepReadingIntro from "./VelaDeepReadingIntro.js";
import VelaDeepTrialReading from "./VelaDeepTrialReading.js";
import VelaFlipPage from "./VelaFlipPage.js";
import VelaPlanSheet from "./VelaPlanSheet.js";
import VelaPlusQuestionEntry from "./VelaPlusQuestionEntry.js";
import VelaQuestionHelp from "./VelaQuestionHelp.js";
import VelaStage from "./VelaStage.js";

const DREAM_SESSION_KEY = "askvela.current-dream.v1";
const PENDING_DEEP_TRIAL_KEY = "askvela.pending-deep-trial.v1";

function hasActiveVelaPlus(user) {
  const metadata = user?.app_metadata || {};
  return metadata.askvela_plan === "vela_plus"
    && metadata.askvela_plan_status === "active";
}

async function deepTrialRequest(client, { method = "GET", body = null } = {}) {
  const { data, error } = await client.auth.getSession();
  const token = data?.session?.access_token;
  if (error || !token) throw new Error("登入狀態已失效，請重新登入。");

  const response = await fetch("/api/deep-trial", {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    cache: "no-store",
  });
  const payload = await response.json();
  return { response, payload };
}

function validDeepTrialSeed(seed) {
  return Boolean(
    seed?.draw?.readingId
    && seed?.requestId
    && Array.isArray(seed?.selectedIndexes)
    && seed.selectedIndexes.length === 3,
  );
}

export default function VelaExperience() {
  const [experience, setExperience] = useState("home");
  const [entryMode, setEntryMode] = useState("landing");
  const [quickQuestion, setQuickQuestion] = useState("");
  const [quickDeepSeed, setQuickDeepSeed] = useState(null);
  const [homeSeed, setHomeSeed] = useState(null);
  const [homeHelpOpen, setHomeHelpOpen] = useState(false);
  const [dreamHandoffText, setDreamHandoffText] = useState("");
  const [planOpen, setPlanOpen] = useState(false);
  const [planReady, setPlanReady] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isVelaPlus, setIsVelaPlus] = useState(false);
  const [trialUsed, setTrialUsed] = useState(false);
  const [trialReady, setTrialReady] = useState(false);
  const [trialError, setTrialError] = useState("");
  const [deepSeed, setDeepSeed] = useState(null);
  const [deepTrialSeed, setDeepTrialSeed] = useState(null);

  const changeExperience = useCallback((next) => {
    if (!["home", "quick-tarot", "astrology", "dream", "deep", "deep-trial"].includes(next)) return;

    if (next === "home") {
      setExperience("home");
      setEntryMode("landing");
      setQuickQuestion("");
      setQuickDeepSeed(null);
      setHomeSeed(null);
      setHomeHelpOpen(false);
      setDreamHandoffText("");
      setDeepSeed(null);
      setDeepTrialSeed(null);
      setTrialError("");
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      return;
    }

    setExperience(next);
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  useEffect(() => {
    const client = getSupabaseBrowser();
    if (!client) {
      const timer = window.setTimeout(() => {
        setPlanReady(true);
        setTrialReady(true);
      }, 0);
      return () => window.clearTimeout(timer);
    }

    let mounted = true;
    const applyUser = (user) => {
      if (!mounted) return;
      const plus = hasActiveVelaPlus(user);
      setCurrentUser(user || null);
      setIsVelaPlus(plus);
      setTrialUsed(false);
      setTrialReady(!user?.id || plus);
      setPlanReady(true);
    };

    client.auth.getUser().then(({ data }) => {
      applyUser(data?.user || null);
    }).catch(() => {
      if (mounted) {
        setPlanReady(true);
        setTrialReady(true);
      }
    });

    const { data: subscription } = client.auth.onAuthStateChange((_event, session) => {
      applyUser(session?.user || null);
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!currentUser?.id || isVelaPlus) return undefined;
    const client = getSupabaseBrowser();
    if (!client) return undefined;
    let cancelled = false;

    (async () => {
      try {
        const { response, payload } = await deepTrialRequest(client);
        if (cancelled) return;
        if (!response.ok) throw new Error(payload?.error || "目前無法確認免費深度解析資格。");
        setTrialUsed(!payload.eligible);
        setTrialError("");
      } catch (error) {
        if (!cancelled) setTrialError(error.message || "目前無法確認免費深度解析資格。");
      } finally {
        if (!cancelled) setTrialReady(true);
      }
    })();

    return () => { cancelled = true; };
  }, [currentUser?.id, isVelaPlus]);

  const enterDeepTrial = useCallback((seed) => {
    if (!validDeepTrialSeed(seed)) return;
    try { window.sessionStorage.removeItem(PENDING_DEEP_TRIAL_KEY); } catch { /* ignore */ }
    setPlanOpen(false);
    setDeepSeed(null);
    setDeepTrialSeed(seed);
    setTrialError("");
    setExperience("deep-trial");
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  const claimAndEnterDeepTrial = useCallback(async (seed, userOverride = null) => {
    if (!validDeepTrialSeed(seed)) return false;
    const user = userOverride || currentUser;
    if (!user?.id) return false;

    if (hasActiveVelaPlus(user)) {
      enterDeepTrial(seed);
      return true;
    }

    const client = getSupabaseBrowser();
    if (!client) return false;

    try {
      const { response, payload } = await deepTrialRequest(client, {
        method: "POST",
        body: {
          action: "claim",
          readingId: seed.draw.readingId,
          requestId: seed.requestId,
        },
      });

      if (response.ok && payload.allowed) {
        setTrialUsed(true);
        setTrialReady(true);
        enterDeepTrial(seed);
        return true;
      }

      if (response.status === 409 && payload?.reason === "TRIAL_ALREADY_USED") {
        setTrialUsed(true);
        setTrialReady(true);
        try { window.sessionStorage.removeItem(PENDING_DEEP_TRIAL_KEY); } catch { /* ignore */ }
        setPlanOpen(true);
        return false;
      }

      throw new Error(payload?.error || "目前無法開始免費深度解析。");
    } catch (error) {
      setTrialError(error.message || "目前無法開始免費深度解析。");
      return false;
    }
  }, [currentUser, enterDeepTrial]);

  useEffect(() => {
    if (!currentUser?.id || typeof window === "undefined") return;
    let raw = "";
    try { raw = window.sessionStorage.getItem(PENDING_DEEP_TRIAL_KEY) || ""; } catch { return; }
    if (!raw) return;

    try {
      const seed = JSON.parse(raw);
      if (!validDeepTrialSeed(seed)) {
        window.sessionStorage.removeItem(PENDING_DEEP_TRIAL_KEY);
        return;
      }
      void claimAndEnterDeepTrial(seed, currentUser);
    } catch {
      try { window.sessionStorage.removeItem(PENDING_DEEP_TRIAL_KEY); } catch { /* ignore */ }
    }
  }, [claimAndEnterDeepTrial, currentUser]);

  useEffect(() => {
    function handleExperience(event) {
      const next = event?.detail;
      if (next === "tarot") {
        setExperience("home");
        setEntryMode("quick");
        setHomeSeed(null);
        setHomeHelpOpen(false);
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
        return;
      }
      if (next === "deep" && !isVelaPlus) {
        setPlanOpen(true);
        return;
      }
      changeExperience(next);
    }
    window.addEventListener("vela:experience", handleExperience);
    return () => window.removeEventListener("vela:experience", handleExperience);
  }, [changeExperience, isVelaPlus]);

  useEffect(() => {
    function handlePopState(event) {
      if (experience !== "home") return;
      const entry = event.state?.askVelaEntry;
      setEntryMode(entry?.mode === "quick" ? "quick" : "landing");
      if (entry?.mode !== "quick") {
        setHomeSeed(null);
        setHomeHelpOpen(false);
      }
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [experience]);

  function revealQuickEntry() {
    setHomeSeed(null);
    setHomeHelpOpen(false);
    setEntryMode("quick");
    const current = window.history.state || {};
    window.history.pushState({ ...current, askVelaEntry: { mode: "quick" } }, "");
  }

  function returnToQuestionEntry() {
    setExperience("home");
    setEntryMode("quick");
    setQuickQuestion("");
    setQuickDeepSeed(null);
    setHomeSeed(null);
    setHomeHelpOpen(false);
    setDeepTrialSeed(null);
    setTrialError("");
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }

  function startQuick(nextQuestion, seed = null) {
    const text = String(nextQuestion || "").trim();
    if (!text || text.length > 500 || !planReady) return;

    if (isVelaPlus) {
      const plusSeed = seed?.question
        ? seed
        : { question: text };
      startDeepReading(plusSeed);
      return;
    }

    setQuickQuestion(text);
    setQuickDeepSeed(seed);
    setTrialError("");
    setExperience("quick-tarot");
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }

  function beginDream(text = "") {
    const nextDream = String(text || "").trim();
    try { window.sessionStorage.removeItem(DREAM_SESSION_KEY); } catch { /* ignore */ }
    setDreamHandoffText(nextDream);
    changeExperience("dream");
  }

  function startDeepReading(seed = null) {
    if (!isVelaPlus) {
      setPlanOpen(true);
      return;
    }

    const nextSeed = seed?.question
      ? {
        question: String(seed.question),
        plan: seed.plan || null,
        selectedOptionId: String(seed.selectedOptionId || ""),
      }
      : null;
    setPlanOpen(false);
    setDeepSeed(nextSeed);
    setDeepTrialSeed(null);
    changeExperience("deep");
  }

  async function startDeepTrial(seed) {
    if (!validDeepTrialSeed(seed)) return false;
    setTrialError("");

    if (!currentUser?.id) {
      try { window.sessionStorage.setItem(PENDING_DEEP_TRIAL_KEY, JSON.stringify(seed)); } catch { /* ignore */ }
      return false;
    }

    if (!isVelaPlus && trialReady && trialUsed) {
      setPlanOpen(true);
      return false;
    }

    return claimAndEnterDeepTrial(seed, currentUser);
  }

  async function completeDeepTrial(seed) {
    if (!validDeepTrialSeed(seed) || isVelaPlus) return;
    const client = getSupabaseBrowser();
    if (!client) return;
    try {
      await deepTrialRequest(client, {
        method: "POST",
        body: {
          action: "complete",
          readingId: seed.draw.readingId,
          requestId: seed.requestId,
        },
      });
      setTrialUsed(true);
      setTrialReady(true);
    } catch {
      // The claim already reserves the one-time trial. Completion is analytics/state polish,
      // so a transient failure must not interrupt the user's reading.
    }
  }

  function handleHomeQuestionReady(seed) {
    if (!seed?.question || !seed?.plan) return;
    const normalizedSeed = { question: String(seed.question), plan: seed.plan };
    setHomeHelpOpen(false);
    if (isVelaPlus && planReady) {
      startDeepReading(normalizedSeed);
      return;
    }
    setHomeSeed(normalizedSeed);
  }

  function chooseHomeDirection(option) {
    if (!homeSeed?.question || !homeSeed?.plan || !option || !planReady) return;
    const seed = {
      question: homeSeed.question,
      plan: homeSeed.plan,
      selectedOptionId: option.id,
    };
    startQuick(option.focusQuestion, seed);
  }

  let content;

  if (experience === "home") {
    content = (
      <section className={`velaExperienceHub velaGuideHome phase12TarotHome entry-${entryMode}${isVelaPlus ? " is-vela-plus" : " is-free"}`}>
        <VelaAccount experience="home" onExperienceChange={changeExperience} />
        <button
          className={`velaPlusStoreButton ${isVelaPlus ? "isActivePlan" : "isPlanEntry"}`}
          type="button"
          onClick={() => setPlanOpen(true)}
        >
          {isVelaPlus ? "✦ Vela+" : "方案"}
        </button>

        <div className="velaHomeStageLayout">
          <VelaStage onCrystalClick={revealQuickEntry} awakened={entryMode !== "landing"} />
        </div>

        {entryMode !== "landing" && (
          <div className="velaHomeEntry mode-quick" id="vela-home-entry">
            {!homeSeed && !homeHelpOpen && (
              <VelaFlipPage pageKey="home-question" step={1} total={5} label="說說你的問題" className="phase12HomeFlipPage">
                <VelaPlusQuestionEntry
                  onReady={handleHomeQuestionReady}
                  onNeedHelp={() => setHomeHelpOpen(true)}
                />
              </VelaFlipPage>
            )}

            {!homeSeed && homeHelpOpen && (
              <VelaFlipPage pageKey="home-help" step={2} total={5} label="選一個方向" className="phase12HomeFlipPage">
                <VelaQuestionHelp
                  onChooseQuestion={(question) => startQuick(question)}
                  onBack={() => setHomeHelpOpen(false)}
                  onAstrology={() => changeExperience("astrology")}
                  onDream={() => beginDream("")}
                />
              </VelaFlipPage>
            )}

            {homeSeed && (
              <VelaFlipPage pageKey="home-clarify" step={2} total={5} label="先釐清你真正想看的地方" className="phase12HomeFlipPage">
                <div className="phase12HomeClarify">
                  <h1>{homeSeed.plan.clarifyingQuestion}</h1>
                  <div className="deepDynamicChoices">
                    {homeSeed.plan.options.map((option) => (
                      <button type="button" key={option.id} disabled={!planReady} onClick={() => chooseHomeDirection(option)}>
                        <strong>{option.label}</strong>
                        <span>{option.focusQuestion}</span>
                      </button>
                    ))}
                  </div>
                  <button className="deepTextBack" type="button" onClick={() => setHomeSeed(null)}>我想補充原本的描述</button>
                </div>
              </VelaFlipPage>
            )}
          </div>
        )}
      </section>
    );
  } else if (experience === "astrology") {
    content = <AstrologyReadingFlowV2 onExperienceChange={changeExperience} />;
  } else if (experience === "dream") {
    content = <DreamReadingFlowV2 initialDream={dreamHandoffText} onExperienceChange={changeExperience} />;
  } else if (experience === "deep") {
    content = (
      <VelaDeepReadingIntro
        initialQuestion={deepSeed?.question || ""}
        initialPlan={deepSeed?.plan || null}
        onBack={() => changeExperience("home")}
      />
    );
  } else if (experience === "deep-trial") {
    content = (
      <VelaDeepTrialReading
        seed={deepTrialSeed}
        onBack={() => changeExperience("home")}
        onOpenPlans={() => setPlanOpen(true)}
        onTrialComplete={() => completeDeepTrial(deepTrialSeed)}
      />
    );
  } else {
    content = (
      <FreeQuickTarot
        initialQuestion={quickQuestion}
        deepSeed={quickDeepSeed}
        trialUsed={trialReady && trialUsed}
        onStartDeepTrial={startDeepTrial}
        onReturnHome={returnToQuestionEntry}
        onOpenPlans={() => setPlanOpen(true)}
        onQuotaExhausted={() => setPlanOpen(true)}
      />
    );
  }

  const planDeepSeed = experience === "quick-tarot" ? quickDeepSeed : null;

  return (
    <>
      {content}
      {trialError && <div className="phase12EntryError deepReadingError" role="alert">{trialError}</div>}
      <VelaPlanSheet
        open={planOpen}
        isVelaPlus={isVelaPlus}
        onClose={() => setPlanOpen(false)}
        onStartDeep={() => startDeepReading(planDeepSeed)}
      />
    </>
  );
}
