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
const DEEP_TRIAL_USED_PREFIX = "askvela.deep-trial.used.v1";

function hasActiveVelaPlus(user) {
  const metadata = user?.app_metadata || {};
  return metadata.askvela_plan === "vela_plus"
    && metadata.askvela_plan_status === "active";
}

function deepTrialUsedKey(userId) {
  return `${DEEP_TRIAL_USED_PREFIX}:${userId}`;
}

function hasUsedDeepTrial(userId) {
  if (!userId || typeof window === "undefined") return false;
  try { return window.localStorage.getItem(deepTrialUsedKey(userId)) === "1"; } catch { return false; }
}

function markDeepTrialUsed(userId) {
  if (!userId || typeof window === "undefined") return;
  try { window.localStorage.setItem(deepTrialUsedKey(userId), "1"); } catch { /* ignore */ }
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
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      return;
    }

    setExperience(next);
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  useEffect(() => {
    const client = getSupabaseBrowser();
    if (!client) {
      const timer = window.setTimeout(() => setPlanReady(true), 0);
      return () => window.clearTimeout(timer);
    }

    let mounted = true;
    const applyUser = (user) => {
      if (!mounted) return;
      setCurrentUser(user || null);
      setIsVelaPlus(hasActiveVelaPlus(user));
      setTrialUsed(Boolean(user?.id && hasUsedDeepTrial(user.id)));
      setPlanReady(true);
    };

    client.auth.getUser().then(({ data }) => {
      applyUser(data?.user || null);
    }).catch(() => {
      if (mounted) setPlanReady(true);
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
    if (!currentUser?.id || typeof window === "undefined") return;
    let raw = "";
    try { raw = window.sessionStorage.getItem(PENDING_DEEP_TRIAL_KEY) || ""; } catch { return; }
    if (!raw) return;

    try {
      const seed = JSON.parse(raw);
      window.sessionStorage.removeItem(PENDING_DEEP_TRIAL_KEY);
      const plus = hasActiveVelaPlus(currentUser);
      const alreadyUsed = hasUsedDeepTrial(currentUser.id);
      if (!plus && alreadyUsed) {
        setPlanOpen(true);
        return;
      }
      if (!plus) {
        markDeepTrialUsed(currentUser.id);
        setTrialUsed(true);
      }
      setDeepTrialSeed(seed);
      setExperience("deep-trial");
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    } catch {
      try { window.sessionStorage.removeItem(PENDING_DEEP_TRIAL_KEY); } catch { /* ignore */ }
    }
  }, [currentUser]);

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
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }

  function startQuick(nextQuestion, seed = null) {
    const text = String(nextQuestion || "").trim();
    if (!text || text.length > 500) return;

    setQuickQuestion(text);
    setQuickDeepSeed(seed);
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

    const nextSeed = seed?.question && seed?.plan
      ? {
        question: String(seed.question),
        plan: seed.plan,
        selectedOptionId: String(seed.selectedOptionId || ""),
      }
      : null;
    setPlanOpen(false);
    setDeepSeed(nextSeed);
    setDeepTrialSeed(null);
    changeExperience("deep");
  }

  function startDeepTrial(seed) {
    if (!seed?.draw?.readingId || !Array.isArray(seed?.selectedIndexes) || seed.selectedIndexes.length !== 3) return;
    if (!currentUser?.id) {
      try { window.sessionStorage.setItem(PENDING_DEEP_TRIAL_KEY, JSON.stringify(seed)); } catch { /* ignore */ }
      return;
    }

    if (!isVelaPlus && trialUsed) {
      setPlanOpen(true);
      return;
    }

    if (!isVelaPlus) {
      markDeepTrialUsed(currentUser.id);
      setTrialUsed(true);
    }
    try { window.sessionStorage.removeItem(PENDING_DEEP_TRIAL_KEY); } catch { /* ignore */ }
    setPlanOpen(false);
    setDeepSeed(null);
    setDeepTrialSeed(seed);
    changeExperience("deep-trial");
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
      />
    );
  } else {
    content = (
      <FreeQuickTarot
        initialQuestion={quickQuestion}
        deepSeed={quickDeepSeed}
        trialUsed={trialUsed}
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
      <VelaPlanSheet
        open={planOpen}
        isVelaPlus={isVelaPlus}
        onClose={() => setPlanOpen(false)}
        onStartDeep={() => startDeepReading(planDeepSeed)}
      />
    </>
  );
}
