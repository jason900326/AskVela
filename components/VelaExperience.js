"use client";

import { useCallback, useEffect, useState } from "react";
import AstrologyReadingFlowV2 from "./AstrologyReadingFlowV2.js";
import DreamReadingFlowV2 from "./DreamReadingFlowV2.js";
import FreeQuickTarot from "./FreeQuickTarot.js";
import VelaAccount from "./VelaAccount.js";
import VelaDeepReadingIntro from "./VelaDeepReadingIntro.js";
import VelaPlanSheet from "./VelaPlanSheet.js";
import VelaStage from "./VelaStage.js";

const DREAM_SESSION_KEY = "askvela.current-dream.v1";
const QUICK_SUGGESTIONS = [
  "今天的我最需要注意什麼？",
  "最近的感情有什麼提醒？",
  "工作／學業現在最值得留意什麼？",
];

export default function VelaExperience() {
  const [experience, setExperience] = useState("home");
  const [entryMode, setEntryMode] = useState("landing");
  const [question, setQuestion] = useState("");
  const [quickQuestion, setQuickQuestion] = useState("");
  const [dreamHandoffText, setDreamHandoffText] = useState("");
  const [planOpen, setPlanOpen] = useState(false);

  const changeExperience = useCallback((next) => {
    if (!["home", "quick-tarot", "astrology", "dream", "deep"].includes(next)) return;

    if (next === "home") {
      setExperience("home");
      setEntryMode("landing");
      setQuestion("");
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

  function startQuick(nextQuestion = question) {
    const text = String(nextQuestion || "").trim();
    if (!text) return;
    setQuickQuestion(text.slice(0, 500));
    changeExperience("quick-tarot");
  }

  function submitQuick(event) {
    event.preventDefault();
    startQuick(question);
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
            <div className="velaDialogueBubble phase12HomeBubble">
              <h1>今天想問 Vela 什麼？</h1>
              <p>先從一個小問題開始。抽一張牌就好。</p>
            </div>

            <form className="phase12QuickForm" onSubmit={submitQuick}>
              <textarea
                rows={3}
                maxLength={500}
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="例如：我今天工作上最需要注意什麼？"
                autoFocus
              />
              <button className="primaryButton" type="submit" disabled={!question.trim()}>抽一張牌 ✦</button>
            </form>

            <div className="phase12SuggestionList" aria-label="不知道問什麼時可以直接選">
              <span>不知道問什麼？</span>
              {QUICK_SUGGESTIONS.map((item) => (
                <button type="button" key={item} onClick={() => startQuick(item)}>{item}</button>
              ))}
            </div>

            <section className="velaJourneyPanel phase12SecondaryJourneys" aria-label="其他 Vela 功能">
              <button type="button" onClick={() => changeExperience("astrology")}><span>◎</span><strong>星象</strong><small>看看最近的運勢</small></button>
              <button type="button" onClick={() => beginDream("")}><span>☾</span><strong>解夢</strong><small>解析昨晚的夢</small></button>
              <button type="button" className="isDeep" onClick={() => setPlanOpen(true)}><span>✦</span><strong>Deep Reading</strong><small>有一件事真的想看深</small></button>
            </section>
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
        onBack={() => changeExperience("home")}
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
