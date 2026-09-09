"use client";

import { useCallback, useEffect, useState } from "react";
import AstrologyReadingFlowV2 from "./AstrologyReadingFlowV2.js";
import DreamReadingFlowV2 from "./DreamReadingFlowV2.js";
import FreeQuickTarot, { FREE_QUESTION_PRESETS } from "./FreeQuickTarot.js";
import VelaAccount from "./VelaAccount.js";
import VelaDeepReadingIntro from "./VelaDeepReadingIntro.js";
import VelaFlipPage from "./VelaFlipPage.js";
import VelaPlanSheet from "./VelaPlanSheet.js";
import VelaStage from "./VelaStage.js";

const DREAM_SESSION_KEY = "askvela.current-dream.v1";

export default function VelaExperience() {
  const [experience, setExperience] = useState("home");
  const [entryMode, setEntryMode] = useState("landing");
  const [quickQuestion, setQuickQuestion] = useState("");
  const [dreamHandoffText, setDreamHandoffText] = useState("");
  const [planOpen, setPlanOpen] = useState(false);

  const changeExperience = useCallback((next) => {
    if (!["home", "quick-tarot", "astrology", "dream", "deep"].includes(next)) return;

    if (next === "home") {
      setExperience("home");
      setEntryMode("landing");
      setQuickQuestion("");
      setDreamHandoffText("");
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      return;
    }

    setExperience(next);
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
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

  function startDeepReading() {
    setPlanOpen(false);
    changeExperience("deep");
  }

  let content;

  if (experience === "home") {
    content = (
      <section className={`velaExperienceHub velaGuideHome phase12TarotHome entry-${entryMode}`}>
        <VelaAccount experience="home" onExperienceChange={changeExperience} />
        <button className="velaPlusStoreButton" type="button" onClick={() => setPlanOpen(true)}>✦ Vela+</button>

        <div className="velaHomeStageLayout">
          <VelaStage onCrystalClick={revealQuickEntry} awakened={entryMode !== "landing"} />
        </div>

        {entryMode !== "landing" && (
          <div className="velaHomeEntry mode-quick" id="vela-home-entry">
            <VelaFlipPage pageKey="home-question" step={1} total={5} label="選一個問題" className="phase12HomeFlipPage">
              <div className="velaDialogueBubble phase12HomeBubble">
                <h1>先讓 Vela 看一個小問題。</h1>
                <p>Free 體驗不用打字；選一題、抽一張牌，就能看看 Vela 怎麼解讀。</p>
              </div>

              <div className="phase12PresetGrid" aria-label="Free 預設問題">
                {FREE_QUESTION_PRESETS.map((item) => (
                  <button type="button" key={item} onClick={() => startQuick(item)}>{item}</button>
                ))}
              </div>

              <aside className="phase12FreePlusHint">
                <div>
                  <span>✦ VELA+</span>
                  <strong>想問自己的問題？</strong>
                  <p>升級後可以自由描述真正困擾你的事情，Vela 會先理解問題，再決定怎麼看。</p>
                </div>
                <button className="ghostButton" type="button" onClick={() => setPlanOpen(true)}>看看 Vela+</button>
              </aside>

              <section className="velaJourneyPanel phase12SecondaryJourneys" aria-label="其他 Vela 功能">
                <button type="button" onClick={() => changeExperience("astrology")}><span>◎</span><strong>星象</strong><small>看看最近的運勢</small></button>
                <button type="button" onClick={() => beginDream("")}><span>☾</span><strong>解夢</strong><small>解析昨晚的夢</small></button>
                <button type="button" className="isDeep" onClick={() => setPlanOpen(true)}><span>✦</span><strong>Deep Reading</strong><small>有一件事真的想看深</small></button>
              </section>
            </VelaFlipPage>
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
