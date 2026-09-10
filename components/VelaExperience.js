"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseBrowser } from "../lib/supabase-browser.js";
import AstrologyReadingFlowV2 from "./AstrologyReadingFlowV2.js";
import DreamReadingFlowV2 from "./DreamReadingFlowV2.js";
import FreeQuickTarot, { FREE_QUESTION_PRESETS } from "./FreeQuickTarot.js";
import VelaAccount from "./VelaAccount.js";
import VelaDeepReadingIntro from "./VelaDeepReadingIntro.js";
import VelaFlipPage from "./VelaFlipPage.js";
import VelaPlanSheet from "./VelaPlanSheet.js";
import VelaPlusQuestionEntry from "./VelaPlusQuestionEntry.js";
import VelaStage from "./VelaStage.js";

const DREAM_SESSION_KEY = "askvela.current-dream.v1";

function hasActiveVelaPlus(user) {
  const metadata = user?.app_metadata || {};
  return metadata.askvela_plan === "vela_plus"
    && metadata.askvela_plan_status === "active";
}

export default function VelaExperience() {
  const [experience, setExperience] = useState("home");
  const [entryMode, setEntryMode] = useState("landing");
  const [quickQuestion, setQuickQuestion] = useState("");
  const [quickDeepSeed, setQuickDeepSeed] = useState(null);
  const [homeSeed, setHomeSeed] = useState(null);
  const [dreamHandoffText, setDreamHandoffText] = useState("");
  const [planOpen, setPlanOpen] = useState(false);
  const [planReady, setPlanReady] = useState(false);
  const [isVelaPlus, setIsVelaPlus] = useState(false);
  const [deepSeed, setDeepSeed] = useState(null);

  const changeExperience = useCallback((next) => {
    if (!["home", "quick-tarot", "astrology", "dream", "deep"].includes(next)) return;

    if (next === "home") {
      setExperience("home");
      setEntryMode("landing");
      setQuickQuestion("");
      setQuickDeepSeed(null);
      setHomeSeed(null);
      setDreamHandoffText("");
      setDeepSeed(null);
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
      setIsVelaPlus(hasActiveVelaPlus(user));
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
    function handleExperience(event) {
      const next = event?.detail;
      if (next === "tarot") {
        setExperience("home");
        setEntryMode("quick");
        setHomeSeed(null);
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
        return;
      }
      changeExperience(next);
    }
    window.addEventListener("vela:experience", handleExperience);
    return () => window.removeEventListener("vela:experience", handleExperience);
  }, [changeExperience]);

  useEffect(() => {
    function handlePopState(event) {
      if (experience !== "home") return;
      const entry = event.state?.askVelaEntry;
      setEntryMode(entry?.mode === "quick" ? "quick" : "landing");
      if (entry?.mode !== "quick") setHomeSeed(null);
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [experience]);

  function revealQuickEntry() {
    setHomeSeed(null);
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
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }

  function startQuick(nextQuestion, seed = null) {
    const text = String(nextQuestion || "").trim();
    if (text.length < 8 || text.length > 500) return;

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
    const nextSeed = seed?.question && seed?.plan
      ? { question: String(seed.question), plan: seed.plan }
      : null;
    setPlanOpen(false);
    setDeepSeed(nextSeed);
    changeExperience("deep");
  }

  function handleHomeQuestionReady(seed) {
    if (!seed?.question || !seed?.plan) return;
    const normalizedSeed = { question: String(seed.question), plan: seed.plan };
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

  const secondaryModes = (
    <section className="phase12SecondaryModes" aria-label="其他占卜方式">
      <span>也可以直接前往</span>
      <div>
        <button type="button" onClick={() => changeExperience("astrology")}>
          <b>◎</b><strong>星座運勢</strong><small>今天／本週運勢</small>
        </button>
        <button type="button" onClick={() => beginDream("")}>
          <b>☾</b><strong>解夢</strong><small>說說你記得的夢</small>
        </button>
      </div>
    </section>
  );

  let content;

  if (experience === "home") {
    content = (
      <section className={`velaExperienceHub velaGuideHome phase12TarotHome entry-${entryMode}${isVelaPlus ? " is-vela-plus" : ""}`}>
        <VelaAccount experience="home" onExperienceChange={changeExperience} />
        <button className="velaPlusStoreButton" type="button" onClick={() => setPlanOpen(true)}>✦ Vela+</button>

        <div className="velaHomeStageLayout">
          <VelaStage onCrystalClick={revealQuickEntry} awakened={entryMode !== "landing"} />
        </div>

        {entryMode !== "landing" && (
          <div className="velaHomeEntry mode-quick" id="vela-home-entry">
            {!homeSeed ? (
              <VelaFlipPage pageKey="home-question" step={1} total={5} label="說說你的問題" className="phase12HomeFlipPage">
                <VelaPlusQuestionEntry onReady={handleHomeQuestionReady} suggestions={FREE_QUESTION_PRESETS} />
                {secondaryModes}
              </VelaFlipPage>
            ) : (
              <VelaFlipPage pageKey="home-clarify" step={2} total={5} label="先釐清你真正想看的地方" className="phase12HomeFlipPage">
                <div className="phase12HomeClarify">
                  <div className="deepVelaLine">{homeSeed.plan.velaLine}</div>
                  <h1>{homeSeed.plan.clarifyingQuestion}</h1>
                  <div className="deepDynamicChoices">
                    {homeSeed.plan.options.map((option) => (
                      <button type="button" key={option.id} disabled={!planReady} onClick={() => chooseHomeDirection(option)}>
                        <strong>{option.label}</strong>
                        <span>{option.focusQuestion}</span>
                      </button>
                    ))}
                  </div>
                  <p className="phase12HomeClarifyNote">
                    {!planReady
                      ? "正在確認你的方案…"
                      : "選完方向後，先免費抽一張。這一張會完整回答，不會做到一半才鎖結果。"}
                  </p>
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
  } else {
    content = (
      <FreeQuickTarot
        initialQuestion={quickQuestion}
        deepSeed={quickDeepSeed}
        onStartDeep={startDeepReading}
        onReturnHome={returnToQuestionEntry}
        onOpenPlans={() => setPlanOpen(true)}
        onQuotaExhausted={() => setPlanOpen(true)}
      />
    );
  }

  return (
    <>
      {content}
      <VelaPlanSheet open={planOpen} onClose={() => setPlanOpen(false)} onStartDeep={startDeepReading} />
    </>
  );
}
