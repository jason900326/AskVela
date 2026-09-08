"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { recommendExperience } from "../lib/vela-experience-router.js";
import AstrologyReadingFlow from "./AstrologyReadingFlow.js";
import DreamReadingFlow from "./DreamReadingFlow.js";
import TarotReadingFlow from "./TarotReadingFlow.js";
import VelaAccount from "./VelaAccount.js";
import VelaStage from "./VelaStage.js";

const DREAM_SESSION_KEY = "askvela.current-dream.v1";

const QUICK_PROMPTS = [
  "最近有件事讓我很猶豫，不知道該怎麼選。",
  "我想看看今天整體的節奏和狀態。",
  "我昨晚做了一個讓我很在意的夢。",
];

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
  const feelingText = feeling === "我連這個也不知道" ? "說不上來哪裡不對，但就是有點卡住" : feeling;
  const goalText = goal === "你幫我決定從哪裡看" ? "先找出最值得注意的地方" : goal;
  return `我最近在${areaText}這一塊，感覺${feelingText}。我想先${goalText}，請幫我看看目前卡住我的可能是什麼，以及現在可以先留意什麼。`;
}

export default function VelaExperience() {
  const [experience, setExperience] = useState("home");
  const [entryMode, setEntryMode] = useState("landing");
  const [guideInput, setGuideInput] = useState("");
  const [guideResult, setGuideResult] = useState(null);
  const [guidedStep, setGuidedStep] = useState("area");
  const [guidedAnswers, setGuidedAnswers] = useState({ area: "", feeling: "", goal: "" });
  const [tarotHandoffQuestion, setTarotHandoffQuestion] = useState("");
  const [dreamHandoffText, setDreamHandoffText] = useState("");
  const recommendation = useMemo(() => guideResult || null, [guideResult]);
  const guidedQuestion = useMemo(() => {
    if (!guidedAnswers.area || !guidedAnswers.feeling || !guidedAnswers.goal) return "";
    return buildGuidedQuestion(guidedAnswers);
  }, [guidedAnswers]);

  const changeExperience = useCallback((next) => {
    if (!["home", "tarot", "astrology", "dream"].includes(next)) return;

    if (next === "home") {
      setExperience("home");
      setEntryMode("landing");
      setGuideInput("");
      setGuideResult(null);
      setGuidedStep("area");
      setGuidedAnswers({ area: "", feeling: "", goal: "" });
      setTarotHandoffQuestion("");
      setDreamHandoffText("");
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      return;
    }

    setExperience(next);
  }, []);

  useEffect(() => {
    function handleExperience(event) {
      changeExperience(event?.detail);
    }
    window.addEventListener("vela:experience", handleExperience);
    return () => window.removeEventListener("vela:experience", handleExperience);
  }, [changeExperience]);

  function revealHomeEntry() {
    setEntryMode("choice");
    setGuideResult(null);
    window.setTimeout(() => {
      document.getElementById("vela-home-entry")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
  }

  function askVela(event) {
    event?.preventDefault?.();
    const text = guideInput.trim();
    if (!text) return;
    setGuideResult(recommendExperience(text));
  }

  function applyQuickPrompt(text) {
    setEntryMode("freeform");
    setGuideInput(text);
    setGuideResult(recommendExperience(text));
  }

  function resetHomeEntry() {
    setEntryMode("choice");
    setGuideInput("");
    setGuideResult(null);
    setGuidedStep("area");
    setGuidedAnswers({ area: "", feeling: "", goal: "" });
  }

  function startGuidedEntry() {
    setEntryMode("guided");
    setGuideResult(null);
    setGuidedStep("area");
    setGuidedAnswers({ area: "", feeling: "", goal: "" });
  }

  function chooseGuidedAnswer(field, value) {
    setGuidedAnswers((current) => ({ ...current, [field]: value }));
    if (field === "area") setGuidedStep("feeling");
    if (field === "feeling") setGuidedStep("goal");
    if (field === "goal") setGuidedStep("result");
  }

  function beginTarot(question = "") {
    setTarotHandoffQuestion(String(question || guideInput).trim());
    changeExperience("tarot");
  }

  function beginDream(text = "") {
    const nextDream = String(text || guideInput).trim();
    window.sessionStorage.removeItem(DREAM_SESSION_KEY);
    setDreamHandoffText(nextDream);
    changeExperience("dream");
  }

  if (experience === "home") {
    return (
      <section className="velaExperienceHub velaGuideHome">
        <VelaAccount experience="home" onExperienceChange={changeExperience} />

        <div className="velaHomeStageLayout">
          <VelaStage onCrystalClick={revealHomeEntry} awakened={entryMode !== "landing"} />
        </div>

        {entryMode !== "landing" && (
          <div className="velaHomeEntry" id="vela-home-entry">
            <div className="velaDialogueBubble">
              <div className="eyebrow">VELA</div>
              <h1>今天想從哪件事開始？</h1>
              <p>你可以直接告訴我一件事，也可以只跟我說「我不知道，只是覺得卡住」。問題不用先想得很完整，我會陪你把它整理出來。</p>
            </div>

            {entryMode === "choice" && (
              <>
                <section className="velaEntryChoices" aria-label="選擇開始方式">
                  <button className="velaEntryChoice isPrimary" type="button" onClick={() => setEntryMode("freeform")}>
                    <span aria-hidden="true">✦</span>
                    <strong>我有件事想問你</strong>
                    <small>直接把最近在意的事告訴 Vela，不用先選塔羅、星座或解夢。</small>
                  </button>
                  <button className="velaEntryChoice" type="button" onClick={startGuidedEntry}>
                    <span aria-hidden="true">☾</span>
                    <strong>我不知道，只是覺得有點卡住</strong>
                    <small>不用先想問題。Vela 會用幾個簡單選擇，陪你找出可以從哪裡開始。</small>
                  </button>
                </section>

                <div className="velaDirectModes" aria-label="直接選擇占卜方式">
                  <span>已經知道想看什麼？</span>
                  <div>
                    <button type="button" onClick={() => changeExperience("tarot")}>塔羅</button>
                    <button type="button" onClick={() => changeExperience("astrology")}>星座運勢</button>
                    <button type="button" onClick={() => changeExperience("dream")}>解夢</button>
                  </div>
                </div>
              </>
            )}

            {entryMode === "freeform" && (
              <>
                <form className="velaGuideForm" onSubmit={askVela}>
                  <div className="guidedPanelHeading">
                    <div>
                      <div className="eyebrow">直接告訴 Vela</div>
                      <h2>最近哪件事最佔你的心思？</h2>
                    </div>
                    <button className="ghostButton" type="button" onClick={resetHomeEntry}>換一種開始方式</button>
                  </div>
                  <label htmlFor="vela-guide">想到多少就說多少</label>
                  <textarea
                    id="vela-guide"
                    rows={3}
                    maxLength={500}
                    value={guideInput}
                    onChange={(event) => { setGuideInput(event.target.value); setGuideResult(null); }}
                    placeholder="例如：我最近一直在想要不要換工作，但又怕自己只是因為累了才想離開。"
                  />
                  <div className="velaGuideActions">
                    <span>{guideInput.length}/500</span>
                    <button className="primaryButton" type="submit" disabled={!guideInput.trim()}>讓 Vela 幫我選</button>
                  </div>
                </form>

                <div className="velaQuickPrompts" aria-label="快速開始">
                  {QUICK_PROMPTS.map((text) => <button type="button" key={text} onClick={() => applyQuickPrompt(text)}>{text}</button>)}
                </div>
              </>
            )}

            {entryMode === "guided" && (
              <section className="guidedEntryPanel" aria-live="polite">
                <div className="guidedPanelHeading">
                  <div>
                    <div className="eyebrow">VELA · 幫我找問題</div>
                    <h2>{guidedStep === "result" ? "好，我大概知道可以從哪裡開始了。" : "先不用想一個完整的問題。"}</h2>
                  </div>
                  <button className="ghostButton" type="button" onClick={resetHomeEntry}>自己問一件事</button>
                </div>

                {guidedStep === "area" && (
                  <div className="guidedStep">
                    <p>最近哪一部分最讓你有感覺？不用選得很準。</p>
                    <div className="guidedChoiceGrid">
                      {GUIDED_AREAS.map((item) => <button type="button" key={item} onClick={() => chooseGuidedAnswer("area", item)}>{item}</button>)}
                    </div>
                  </div>
                )}

                {guidedStep === "feeling" && (
                  <div className="guidedStep">
                    <p>比較接近下面哪一種感覺？</p>
                    <div className="guidedChoiceGrid">
                      {GUIDED_FEELINGS.map((item) => <button type="button" key={item} onClick={() => chooseGuidedAnswer("feeling", item)}>{item}</button>)}
                    </div>
                    <button className="guidedBackButton" type="button" onClick={() => setGuidedStep("area")}>← 上一步</button>
                  </div>
                )}

                {guidedStep === "goal" && (
                  <div className="guidedStep">
                    <p>今天你比較希望我先幫你做什麼？</p>
                    <div className="guidedChoiceGrid">
                      {GUIDED_GOALS.map((item) => <button type="button" key={item} onClick={() => chooseGuidedAnswer("goal", item)}>{item}</button>)}
                    </div>
                    <button className="guidedBackButton" type="button" onClick={() => setGuidedStep("feeling")}>← 上一步</button>
                  </div>
                )}

                {guidedStep === "result" && guidedQuestion && (
                  <div className="guidedResult">
                    <p>你現在不一定需要一個「預測結果」的問題。我會先把剛才的感覺整理成這一句：</p>
                    <blockquote>{guidedQuestion}</blockquote>
                    <p>這種模糊、卡住、還不知道真正問題在哪裡的狀態，我會先用塔羅拆成「現在的狀態／可能的阻礙／可以先留意的方向」，而不是逼你先給自己一個答案。</p>
                    <div className="guideRecommendationActions">
                      <button className="primaryButton" type="button" onClick={() => beginTarot(guidedQuestion)}>好，從這裡開始塔羅</button>
                      <button className="ghostButton" type="button" onClick={() => setGuidedStep("goal")}>我想改一下</button>
                    </div>
                  </div>
                )}
              </section>
            )}
          </div>
        )}

        {entryMode !== "guided" && recommendation && (
          <div className="guideRecommendationOverlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setGuideResult(null); }}>
            <section className="guideRecommendation" role="dialog" aria-modal="true" aria-labelledby="vela-recommendation-title">
              <button className="guideRecommendationClose" type="button" onClick={() => setGuideResult(null)} aria-label="關閉建議">×</button>
              <div className="eyebrow">{recommendation.eyebrow}</div>
              <h2 id="vela-recommendation-title">{recommendation.title}</h2>
              <p>{recommendation.message}</p>
              <div className="guideRecommendationActions">
                {recommendation.mode === "tarot" && <button className="primaryButton" type="button" onClick={() => beginTarot(guideInput)}>好，開始塔羅</button>}
                {recommendation.mode === "astrology" && <button className="primaryButton" type="button" onClick={() => changeExperience("astrology")}>看看最近的星象節奏</button>}
                {recommendation.mode === "dream" && <button className="primaryButton" type="button" onClick={() => beginDream(guideInput)}>好，從這個夢開始</button>}
                <button className="ghostButton" type="button" onClick={() => { setGuideInput(""); setGuideResult(null); }}>換一件事問 Vela</button>
              </div>
            </section>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="velaExperienceHub">
      {experience === "astrology" ? (
        <AstrologyReadingFlow onExperienceChange={changeExperience} />
      ) : experience === "dream" ? (
        <DreamReadingFlow initialDream={dreamHandoffText} onExperienceChange={changeExperience} />
      ) : (
        <TarotReadingFlow initialQuestion={tarotHandoffQuestion} onExperienceChange={changeExperience} />
      )}
    </section>
  );
}
