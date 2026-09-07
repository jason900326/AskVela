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
      message: "你不是只問一個單一事件，而是想知道今天或這一週的整體狀態，這種問題比較適合星座運勢。星座功能已經有介面，但我會等書籍來源補齊後才正式產生解讀，不會拿沒有來源的文字冒充有根據的運勢。",
    };
  }

  return {
    mode: "tarot",
    eyebrow: "VELA 建議 · 塔羅",
    title: "這件事比較適合用塔羅把問題拆開來看。",
    message: "你問的是一個具體的猶豫、關係或下一步。這類問題用牌陣看現況、阻礙和建議會比較清楚，而且塔羅目前已經有 Waite 與 Mathers 的來源可以追溯。",
  };
}

export default function VelaExperience() {
  const [experience, setExperience] = useState("home");
  const [guideInput, setGuideInput] = useState("");
  const [guideResult, setGuideResult] = useState(null);
  const recommendation = useMemo(() => guideResult || null, [guideResult]);

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
    setGuideInput(text);
    setGuideResult(recommendExperience(text));
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
            <p>先跟我說你現在在意什麼。你不用先決定要塔羅、星座還是解夢，我會依照你說的內容幫你選一個比較合適的方式。</p>
          </div>
        </div>

        <form className="velaGuideForm" onSubmit={askVela}>
          <label htmlFor="vela-guide">跟 Vela 說</label>
          <textarea
            id="vela-guide"
            rows={3}
            maxLength={500}
            value={guideInput}
            onChange={(event) => setGuideInput(event.target.value)}
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

        {recommendation && (
          <section className="guideRecommendation" aria-live="polite">
            <div className="eyebrow">{recommendation.eyebrow}</div>
            <h2>{recommendation.title}</h2>
            <p>{recommendation.message}</p>
            <div className="guideRecommendationActions">
              {recommendation.mode === "tarot" && <button className="primaryButton" type="button" onClick={() => setExperience("tarot")}>好，開始塔羅</button>}
              {recommendation.mode === "astrology" && <button className="primaryButton" type="button" onClick={() => setExperience("astrology")}>看看星座功能目前的狀態</button>}
              {recommendation.mode === "dream" && (
                <>
                  <button className="primaryButton" type="button" disabled>解夢資料庫準備中</button>
                  <button className="ghostButton" type="button" onClick={() => setExperience("tarot")}>先用塔羅整理這個夢帶來的感受</button>
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
        : <TarotReadingFlow onExperienceChange={setExperience} />}
    </section>
  );
}
