"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import AstrologyReadingFlowV2 from "./AstrologyReadingFlowV2.js";
import DreamReadingFlowV2 from "./DreamReadingFlowV2.js";
import TarotReadingFlowV4 from "./TarotReadingFlowV4.js";
import VelaAccount from "./VelaAccount.js";
import VelaStage from "./VelaStage.js";

const DREAM_SESSION_KEY = "askvela.current-dream.v1";

const GUIDED_AREAS = [
  "感情 / 人際",
  "工作 / 學業",
  "自己",
  "家庭",
  "未來",
  "我也說不上來",
];

const GUIDED_FEELINGS = [
  "一直在猶豫",
  "好像停在原地",
  "腦袋一直想同一件事",
  "很多事情一起壓著我",
  "沒發生什麼，但就是怪怪的",
  "我連這個也不知道",
];

const GUIDED_GOALS = [
  "看看我卡在哪裡",
  "幫我整理現在的狀態",
  "看看我忽略了什麼",
  "給我一個可以先做的下一步",
  "你幫我決定從哪裡看",
];

function buildGuidedQuestion({ area, feeling, goal }) {
  const areaText = area === "我也說不上來" ? "最近整體的生活" : area;
  const feelingText = feeling === "我連這個也不知道"
    ? "說不上來哪裡不對，但就是有點卡住"
    : feeling;
  const goalText = goal === "你幫我決定從哪裡看"
    ? "先找出最值得注意的地方"
    : goal;

  return `我最近在${areaText}這一塊，感覺${feelingText}。我想先${goalText}，請幫我看看目前卡住我的可能是什麼，以及現在可以先留意什麼。`;
}

export default function VelaExperience() {
  const rootRef = useRef(null);
  const sceneTimelineRef = useRef(null);
  const sceneTransitionRef = useRef(false);
  const [experience, setExperience] = useState("home");
  const [entryMode, setEntryMode] = useState("landing");
  const [guideInput, setGuideInput] = useState("");
  const [guidedStep, setGuidedStep] = useState("area");
  const [guidedAnswers, setGuidedAnswers] = useState({ area: "", feeling: "", goal: "" });
  const [tarotHandoffQuestion, setTarotHandoffQuestion] = useState("");
  const [dreamHandoffText, setDreamHandoffText] = useState("");
  const [crystalAnimating, setCrystalAnimating] = useState(false);
  const [sceneTransitioning, setSceneTransitioning] = useState(false);

  const guidedQuestion = useMemo(() => {
    if (!guidedAnswers.area || !guidedAnswers.feeling || !guidedAnswers.goal) return "";
    return buildGuidedQuestion(guidedAnswers);
  }, [guidedAnswers]);

  const applyExperience = useCallback((next) => {
    if (next === "home") {
      setExperience("home");
      setEntryMode("landing");
      setGuideInput("");
      setGuidedStep("area");
      setGuidedAnswers({ area: "", feeling: "", goal: "" });
      setTarotHandoffQuestion("");
      setDreamHandoffText("");
      setCrystalAnimating(false);
    } else {
      setExperience(next);
    }

    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  const changeExperience = useCallback((next) => {
    if (!["home", "tarot", "astrology", "dream"].includes(next)) return;
    if (next === experience || sceneTransitionRef.current) return;

    const root = rootRef.current;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!root || prefersReducedMotion) {
      applyExperience(next);
      return;
    }

    const overlay = root.querySelector(".velaSceneTransition");
    const curtain = root.querySelector(".velaSceneCurtain");
    const mist = root.querySelector(".velaSceneMist");
    const glint = root.querySelector(".velaSceneGlint");

    if (!overlay || !curtain || !mist || !glint) {
      applyExperience(next);
      return;
    }

    sceneTimelineRef.current?.kill();
    sceneTransitionRef.current = true;
    setSceneTransitioning(true);

    gsap.set(overlay, { autoAlpha: 1 });
    gsap.set(curtain, { xPercent: 118, skewX: -7 });
    gsap.set(mist, { xPercent: 96, autoAlpha: 0, scale: 1.08 });
    gsap.set(glint, { x: "58vw", autoAlpha: 0, rotation: 7 });

    const timeline = gsap.timeline({
      defaults: { overwrite: "auto" },
      onComplete: () => {
        gsap.set(overlay, { autoAlpha: 0 });
        sceneTimelineRef.current = null;
        sceneTransitionRef.current = false;
        setSceneTransitioning(false);
      },
      onInterrupt: () => {
        sceneTimelineRef.current = null;
        sceneTransitionRef.current = false;
        setSceneTransitioning(false);
      },
    });

    sceneTimelineRef.current = timeline;

    timeline
      .to(curtain, { xPercent: 0, duration: 0.44, ease: "power4.inOut" })
      .to(mist, { xPercent: 0, autoAlpha: 0.92, duration: 0.4, ease: "power3.out" }, "-=0.33")
      .to(glint, { x: "0vw", autoAlpha: 0.72, duration: 0.36, ease: "power2.out" }, "-=0.34")
      .add(() => {
        timeline.pause();
        applyExperience(next);
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => timeline.resume());
        });
      })
      .to(glint, { x: "-58vw", autoAlpha: 0, duration: 0.3, ease: "power2.in" }, "+=0.02")
      .to(mist, { xPercent: -80, autoAlpha: 0, duration: 0.42, ease: "power3.in" }, "<")
      .to(curtain, { xPercent: -118, duration: 0.48, ease: "power4.inOut" }, "<0.02");
  }, [applyExperience, experience]);

  useEffect(() => {
    return () => sceneTimelineRef.current?.kill();
  }, []);

  useEffect(() => {
    function handleExperience(event) {
      changeExperience(event?.detail);
    }
    window.addEventListener("vela:experience", handleExperience);
    return () => window.removeEventListener("vela:experience", handleExperience);
  }, [changeExperience]);

  useEffect(() => {
    function handlePopState(event) {
      if (experience !== "home") return;
      const entry = event.state?.askVelaEntry;
      if (!entry) {
        setEntryMode("landing");
        setGuidedStep("area");
        setCrystalAnimating(false);
        return;
      }
      setEntryMode(entry.mode || "choice");
      setGuidedStep(entry.step || "area");
      setCrystalAnimating(false);
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [experience]);

  useLayoutEffect(() => {
    if (experience !== "home" || entryMode !== "choice" || !crystalAnimating || !rootRef.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setCrystalAnimating(false);
      return;
    }

    const context = gsap.context(() => {
      const choices = gsap.utils.toArray(".velaJourneyChoice");

      gsap.set(".velaDialogueBubble", { autoAlpha: 0, y: 18, scale: 0.97 });
      gsap.set(".velaJourneyPanel", { autoAlpha: 0, y: 28, scale: 0.97 });
      gsap.set(choices, { autoAlpha: 0, y: 16, scale: 0.96 });

      gsap.timeline({
        defaults: { overwrite: "auto" },
        onComplete: () => setCrystalAnimating(false),
      })
        .fromTo(
          ".velaCrystalTransition",
          { autoAlpha: 1, clipPath: "circle(0% at 50% 78%)" },
          { autoAlpha: 1, clipPath: "circle(145% at 50% 78%)", duration: 0.58, ease: "power4.inOut" },
        )
        .fromTo(
          ".velaCharacterSlot",
          { scale: 1.035, y: 12 },
          { scale: 1, y: 0, duration: 0.48, ease: "power3.out" },
          "-=0.22",
        )
        .to(".velaCrystalTransition", { autoAlpha: 0, duration: 0.36, ease: "power2.out" })
        .to(".velaDialogueBubble", { autoAlpha: 1, y: 0, scale: 1, duration: 0.38, ease: "back.out(1.35)" }, "-=0.18")
        .to(".velaJourneyPanel", { autoAlpha: 1, y: 0, scale: 1, duration: 0.44, ease: "power3.out" }, "-=0.24")
        .to(choices, { autoAlpha: 1, y: 0, scale: 1, duration: 0.34, stagger: 0.065, ease: "power2.out" }, "-=0.28");
    }, rootRef);

    return () => context.revert();
  }, [crystalAnimating, entryMode, experience]);

  function pushEntryHistory(mode, step = "area") {
    const current = window.history.state || {};
    window.history.pushState({ ...current, askVelaEntry: { mode, step } }, "");
  }

  function revealHomeEntry() {
    if (entryMode !== "landing" || crystalAnimating) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const root = rootRef.current;

    if (prefersReducedMotion || !root) {
      setEntryMode("choice");
      pushEntryHistory("choice");
      return;
    }

    const crystal = root.querySelector(".velaCrystalArtwork");
    const aura = root.querySelector(".velaCrystalAura");
    const hint = root.querySelector(".velaCrystalHint");

    setCrystalAnimating(true);

    gsap.timeline({
      defaults: { overwrite: "auto" },
      onComplete: () => {
        setEntryMode("choice");
        pushEntryHistory("choice");
      },
    })
      .to(hint, { autoAlpha: 0, y: 6, duration: 0.16, ease: "power1.out" })
      .to(crystal, {
        scale: 1.14,
        y: -4,
        filter: "brightness(1.28) drop-shadow(0 0 34px rgba(224, 172, 255, .78))",
        duration: 0.28,
        ease: "power2.out",
      }, "<")
      .to(aura, { scale: 1.55, autoAlpha: 1, duration: 0.3, ease: "power2.out" }, "<")
      .to(crystal, { scale: 1, y: 0, duration: 0.16, ease: "power1.inOut" });
  }

  function openFreeform() {
    setGuideInput("");
    setEntryMode("freeform");
    pushEntryHistory("freeform");
  }

  function startGuidedEntry() {
    setEntryMode("guided");
    setGuidedStep("area");
    setGuidedAnswers({ area: "", feeling: "", goal: "" });
    pushEntryHistory("guided", "area");
  }

  function chooseGuidedAnswer(field, value) {
    setGuidedAnswers((current) => ({ ...current, [field]: value }));

    if (field === "area") {
      setGuidedStep("feeling");
      pushEntryHistory("guided", "feeling");
    }
    if (field === "feeling") {
      setGuidedStep("goal");
      pushEntryHistory("guided", "goal");
    }
    if (field === "goal") {
      setGuidedStep("result");
      pushEntryHistory("guided", "result");
    }
  }

  function beginTarot(question = "") {
    setTarotHandoffQuestion(String(question || guideInput).trim());
    changeExperience("tarot");
  }

  function submitTarotQuestion(event) {
    event.preventDefault();
    const text = guideInput.trim();
    if (!text) return;
    beginTarot(text);
  }

  function beginDream(text = "") {
    const nextDream = String(text || "").trim();
    try { window.sessionStorage.removeItem(DREAM_SESSION_KEY); } catch { /* ignore */ }
    setDreamHandoffText(nextDream);
    changeExperience("dream");
  }

  const dialogueTitle = entryMode === "choice"
    ? "今天，你帶了什麼來？"
    : entryMode === "freeform"
      ? "有件事想問？"
      : "不知道怎麼說也沒關係。";

  return (
    <section ref={rootRef} className={`velaExperienceFrame ${sceneTransitioning ? "isSceneTransitioning" : ""}`}>
      <div className="velaSceneTransition" aria-hidden="true">
        <div className="velaSceneCurtain" />
        <div className="velaSceneMist" />
        <div className="velaSceneGlint" />
      </div>

      {experience === "home" ? (
        <section className={`velaExperienceHub velaGuideHome entry-${entryMode} ${crystalAnimating ? "isCrystalTransitioning" : ""}`}>
          <div className="velaCrystalTransition" aria-hidden="true" />
          <VelaAccount experience="home" onExperienceChange={changeExperience} />

          <div className="velaHomeStageLayout">
            <VelaStage onCrystalClick={revealHomeEntry} awakened={entryMode !== "landing"} />
          </div>

          {entryMode !== "landing" && (
            <div className={`velaHomeEntry mode-${entryMode}`} id="vela-home-entry">
              <div className="velaDialogueBubble">
                <h1>{dialogueTitle}</h1>
                {entryMode === "choice" && <p>塔羅・星座・解夢</p>}
              </div>

              {entryMode === "choice" && (
                <section className="velaJourneyPanel" aria-label="選擇你的旅程">
                  <div className="velaJourneyHeading"><span>✦</span><strong>選擇你的旅程</strong><span>✦</span></div>
                  <div className="velaJourneyGrid">
                    <button className="velaJourneyChoice journeyTarot" type="button" onClick={openFreeform}>
                      <span className="journeyIcon" aria-hidden="true">✦</span>
                      <span className="journeyCopy"><strong>有件事想問</strong><small>塔羅指引・看見答案</small></span>
                      <span className="journeyArrow" aria-hidden="true">›</span>
                    </button>

                    <button className="velaJourneyChoice journeyAstrology" type="button" onClick={() => changeExperience("astrology")}>
                      <span className="journeyIcon" aria-hidden="true">◎</span>
                      <span className="journeyCopy"><strong>想看看最近的運勢</strong><small>星座運勢・掌握節奏</small></span>
                      <span className="journeyArrow" aria-hidden="true">›</span>
                    </button>

                    <button className="velaJourneyChoice journeyDream" type="button" onClick={() => beginDream("")}>
                      <span className="journeyIcon" aria-hidden="true">☾</span>
                      <span className="journeyCopy"><strong>我做了一個夢</strong><small>夢境解析・探索潛意識</small></span>
                      <span className="journeyArrow" aria-hidden="true">›</span>
                    </button>

                    <button className="velaJourneyChoice journeyGuided" type="button" onClick={startGuidedEntry}>
                      <span className="journeyIcon" aria-hidden="true">✧</span>
                      <span className="journeyCopy"><strong>我也說不上來</strong><small>讓 Vela 陪你慢慢整理</small></span>
                      <span className="journeyArrow" aria-hidden="true">›</span>
                    </button>
                  </div>
                </section>
              )}

              {entryMode === "freeform" && (
                <form className="velaGuideForm" onSubmit={submitTarotQuestion}>
                  <h2>最近哪件事最佔你的心思？</h2>
                  <textarea
                    id="vela-guide"
                    rows={3}
                    maxLength={500}
                    value={guideInput}
                    onChange={(event) => setGuideInput(event.target.value)}
                    placeholder="例如：我最近一直在想要不要換工作，但又怕自己只是因為累了才想離開。"
                    autoFocus
                  />
                  <div className="velaGuideActions">
                    <span>{guideInput.length}/500</span>
                    <button className="primaryButton" type="submit" disabled={!guideInput.trim()}>開始塔羅</button>
                  </div>
                </form>
              )}

              {entryMode === "guided" && (
                <section className="guidedEntryPanel" aria-live="polite">
                  {guidedStep === "area" && (
                    <div className="guidedStep">
                      <p>最近哪一部分最讓你有感覺？</p>
                      <div className="guidedChoiceGrid">
                        {GUIDED_AREAS.map((item) => (
                          <button type="button" key={item} onClick={() => chooseGuidedAnswer("area", item)}>{item}</button>
                        ))}
                      </div>
                    </div>
                  )}

                  {guidedStep === "feeling" && (
                    <div className="guidedStep">
                      <p>比較接近哪一種感覺？</p>
                      <div className="guidedChoiceGrid">
                        {GUIDED_FEELINGS.map((item) => (
                          <button type="button" key={item} onClick={() => chooseGuidedAnswer("feeling", item)}>{item}</button>
                        ))}
                      </div>
                    </div>
                  )}

                  {guidedStep === "goal" && (
                    <div className="guidedStep">
                      <p>今天比較希望我先幫你做什麼？</p>
                      <div className="guidedChoiceGrid">
                        {GUIDED_GOALS.map((item) => (
                          <button type="button" key={item} onClick={() => chooseGuidedAnswer("goal", item)}>{item}</button>
                        ))}
                      </div>
                    </div>
                  )}

                  {guidedStep === "result" && guidedQuestion && (
                    <div className="guidedResult">
                      <p>我想先從這句開始：</p>
                      <blockquote>{guidedQuestion}</blockquote>
                      <div className="guideRecommendationActions">
                        <button className="primaryButton" type="button" onClick={() => beginTarot(guidedQuestion)}>好，就從這裡看看</button>
                      </div>
                    </div>
                  )}
                </section>
              )}
            </div>
          )}
        </section>
      ) : (
        <section className="velaExperienceHub">
          {experience === "astrology" ? (
            <AstrologyReadingFlowV2 onExperienceChange={changeExperience} />
          ) : experience === "dream" ? (
            <DreamReadingFlowV2 initialDream={dreamHandoffText} onExperienceChange={changeExperience} />
          ) : (
            <TarotReadingFlowV4 initialQuestion={tarotHandoffQuestion} onExperienceChange={changeExperience} />
          )}
        </section>
      )}
    </section>
  );
}
