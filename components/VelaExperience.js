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
      if (next === "tarot") changeExperience("quick-tarot");
      else changeExperience(next);
    }
    window.addEventListener("vela:experience", handleExperience);
    return () => window.removeEventListener("vela:experience", handleExperience);
  }, [changeExperience]);

  useEffect(() => {
    function handlePopState(event) {
      if (experience !== "home") return;
      const entry = event.state?.askVelaEntry;
      setEntryMode(entry?.mode === "quick" ? "quick" : "landing");
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [experience]);

  function revealQuickEntry() {
    setEntryMode("quick");
    const current = window.history.state || {};
    window.history.pushState({ ...current, askVelaEntry: { mode: "quick" } }, "");
  }

  function startQuick(nextQuestion) {
    const text = String(nextQuestion || "").trim();
    if (!FREE_QUESTION_PRESETS.includes(text)) return;

    setQuickQuestion(text);
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
            {!planReady ? (
              <VelaFlipPage pageKey="home-plan-check" step={1} total={5} label="準備中" className="phase12HomeFlipPage">
                <div className="phase12PlanChecking">Vela 正在確認你的方案…</div>
              </VelaFlipPage>
            ) : isVelaPlus ? (
              <VelaFlipPage pageKey="home-vela-plus" step={1} total={7} label="說說你的問題" className="phase12HomeFlipPage">
                <VelaPlusQuestionEntry onReady={startDeepReading} />
                {secondaryModes}
              </VelaFlipPage>
            ) : (
              <VelaFlipPage pageKey="home-question" step={1} total={5} label="選一個問題" className="phase12HomeFlipPage">
                <div className="velaDialogueBubble phase12HomeBubble">
                  <h1>今天想看什麼？</h1>
                  <p>選一題，抽一張牌。</p>
                </div>

                <div className="phase12PresetGrid" aria-label="Free 預設問題">
                  {FREE_QUESTION_PRESETS.map((item) => (
                    <button type="button" key={item} onClick={() => startQuick(item)}>{item}</button>
                  ))}
                </div>

                {secondaryModes}
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
        onOpenPlans={() => setPlanOpen(true)}
      />
    );
  } else {
    content = (
      <FreeQuickTarot
        initialQuestion={quickQuestion}
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
