"use client";

import { useEffect, useMemo, useState } from "react";
import AstrologyReadingFlow from "./AstrologyReadingFlow.js";
import TarotReadingFlow from "./TarotReadingFlow.js";
import VelaAccount from "./VelaAccount.js";

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

function recommendExperience(message) {
  const text = String(message || "").trim();
  const dreamLike = /(夢到|夢見|做夢|惡夢|噩夢|夢境|昨晚.*夢|睡夢)/u.test(text);
  const astrologyLike = /(今天|今日|本週|這週|這星期|這禮拜|運勢|星座|生日|整體.*節奏|近期.*狀態)/u.test(text);

  if (dreamLike) {
    return {
      mode: "dream",
      eyebrow: "VELA 建議 · 解夢",
      title: "這件事比較適合先從夢的內容開始看。",
      message: "你在意的是夢本身帶來的感受與象徵，所以我會優先選解夢，而不是硬把它塞進塔羅或星座。不過解夢的來源資料庫還在準備；如果你想現在就整理，也可以先用塔羅看看這個夢碰到了你哪個現實議題。",
    };
  }

  if (astrologyLike) {
    return {
      mode: "astrology",
      eyebrow: "VELA 建議 · 星座",
      title: "這比較像是在看一段時間的整體節奏。",
      message: "你不是只問一個單一事件，而是想知道今天或這一週的整體狀態，這種問題比較適合星座運勢。星座功能會用固定的星象計算與可追溯來源來解讀，不會讓模型自己發明天空位置。",
    };
  }

  return {
    mode: "tarot",
    eyebrow: "VELA 建議 · 塔羅",
    title: "這件事比較適合用塔羅把問題拆開來看。",
    message: "你問的是一個具體的猶豫、關係或下一步。這類問題用牌陣看現況、阻礙和建議會比較清楚，而且塔羅目前已經有 Waite 與 Mathers 的來源可以追溯。",
  };
}

function buildGuidedQuestion({ area, feeling, goal }) {
  const areaText = area === "我也說不上來" ? "最近整體的生活" : area;
  const feelingText = feeling === "我連這個也不知道" ? "說不上來哪裡不對，但就是有點卡住" : feeling;
  const goalText = goal === "你幫我決定從哪裡看" ? "先找出最值得注意的地方" : goal;
  return `我最近在${areaText}這一塊，感覺${feelingText}。我想先${goalText}，請幫我看看目前卡住我的可能是什麼，以及現在可以先留意什麼。`;
}

export default function VelaExperience() {
  const [experience, setExperience] = useState("home");
  const [entryMode, setEntryMode] = useState("choice");
  const [guideInput, setGuideInput] = useState("");
  const [guideResult, setGuideResult] = useState(null);
  const [guidedStep, setGuidedStep] = useState("area");
  const [guidedAnswers, setGuidedAnswers] = useState({ area: "", feeling: "", goal: "" });
  const [tarotHandoffQuestion, setTarotHandoffQuestion] = useState("");
  const recommendation = useMemo(() => guideResult || null, [guideResult]);
  const guidedQuestion = useMemo(() => {
    if (!guidedAnswers.area || !guidedAnswers.feeling || !guidedAnswers.goal) return "";
    return buildGuidedQuestion(guidedAnswers);
  }, [guidedAnswers]);

  useEffect(() => {
    function handleExperience(event) {
      if (["home", "tarot", "astrology"].includes(event?.detail)) setExperience(event.detail);
    }
    window.addEventListener("vela:experience", handleExperience);
    return () => window.removeEventListener("vela:experience", handleExperience);
  }, []);

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
    setExperience("tarot");
  }

  if (experience === "home") {
    return (
      <section className="velaExperienceHub velaGuideHome">
        <VelaAccount experience="home" onExperienceChange={setExperience} />

        <div className="fortuneTellerStage">
          <div className="fortuneTellerPortrait" aria-hidden="true">
            <div className="fortuneTellerHalo" />
            <div className="fortuneTellerHead">☾</div>
            <div className="fortuneTellerBody" />
            <div className="fortuneTellerTable">
              <div className="fortuneTellerCrystal"><span>✦</span></div>
            </div>
          </div>

          <div className="velaDialogueBubble">
            <div className="eyebrow">VELA</div>
            <h1>今天想從哪件事開始？</h1>
            <p>你可以直接告訴我一件事，也可以只跟我說「我不知道，只是覺得卡住」。問題不用先想得很完整，我會陪你把它整理出來。</p>
          </div>
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

            <div className="velaQuickPrompts" aria-label="也可以快速開始">
              {QUICK_PROMPTS.map((text) => <button type="button" key={text} onClick={() => applyQuickPrompt(text)}>{text}</button>)}
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

        {entryMode !== "guided" && recommendation && (
          <section className="guideRecommendation" aria-live="polite">
            <div className="eyebrow">{recommendation.eyebrow}</div>
            <h2>{recommendation.title}</h2>
            <p>{recommendation.message}</p>
            <div className="guideRecommendationActions">
              {recommendation.mode === "tarot" && <button className="primaryButton" type="button" onClick={() => beginTarot(guideInput)}>好，開始塔羅</button>}
              {recommendation.mode === "astrology" && <button className="primaryButton" type="button" onClick={() => setExperience("astrology")}>看看最近的星象節奏</button>}
              {recommendation.mode === "dream" && (
                <>
                  <button className="primaryButton" type="button" disabled>解夢資料庫準備中</button>
                  <button className="ghostButton" type="button" onClick={() => beginTarot(guideInput)}>先用塔羅整理這個夢帶來的感受</button>
                </>
              )}
              <button className="ghostButton" type="button" onClick={() => { setGuideInput(""); setGuideResult(null); }}>換一件事問 Vela</button>
            </div>
          </section>
        )}
      </section>
    );
  }

  return (
    <section className="velaExperienceHub">
      <div className="experienceModeHeader">
        <button type="button" onClick={() => setExperience("home")}>← 回到 Vela</button>
        <span>{experience === "astrology" ? "星座" : "塔羅"}</span>
      </div>
      {experience === "astrology"
        ? <AstrologyReadingFlow onExperienceChange={setExperience} />
        : <TarotReadingFlow initialQuestion={tarotHandoffQuestion} onExperienceChange={setExperience} />}
    </section>
  );
}
