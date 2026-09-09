"use client";

import { useMemo, useState } from "react";
import VelaAccount from "./VelaAccount.js";
import VelaFlipPage from "./VelaFlipPage.js";

const FRICTIONS = [
  "我一直在兩個選擇之間猶豫",
  "我知道哪裡不舒服，但說不清原因",
  "我很在意另一個人的反應",
  "我怕自己只是因為累了才想改變",
  "我想做決定，但資訊還不夠",
  "我也說不上來",
];

export default function VelaDeepReadingIntro({ onBack, onOpenPlans }) {
  const [step, setStep] = useState(1);
  const [question, setQuestion] = useState("");
  const [friction, setFriction] = useState("");
  const [error, setError] = useState("");

  const summary = useMemo(() => {
    if (!question.trim()) return "";
    if (!friction) return question.trim();
    return `${question.trim()}\n\n目前最卡的地方：${friction}`;
  }, [question, friction]);

  function continueFromQuestion() {
    if (!question.trim()) {
      setError("先把這件事說給 Vela 聽一點點就好。");
      return;
    }
    setError("");
    setStep(2);
  }

  return (
    <section className="deepReadingPrototype">
      <VelaAccount experience="tarot" />
      <button className="velaPlusStoreButton" type="button" onClick={onOpenPlans}>✦ Vela+</button>
      <button className="deepBackButton" type="button" onClick={onBack}>← 回到首頁</button>

      <div className="deepReadingShell">
        <div className="deepReadingEyebrow">✦ DEEP READING · PROTOTYPE</div>

        {step === 1 && (
          <VelaFlipPage pageKey="deep-1" step={1} total={3} label="先說發生了什麼">
            <div className="deepReadingStep velaFlipContentCard">
              <h1>這次不用急著決定要抽幾張牌。</h1>
              <p>先告訴我，最近哪件事最讓你放不下？</p>
              <textarea
                rows={5}
                maxLength={700}
                value={question}
                onChange={(event) => {
                  setQuestion(event.target.value);
                  if (error) setError("");
                }}
                placeholder="例如：我拿到一個新的工作 offer，但不知道該不該離開現在的公司。"
                autoFocus
              />
              <div className="deepReadingActions">
                <span>{question.length}/700</span>
                <button className="primaryButton" type="button" onClick={continueFromQuestion}>翻下一頁</button>
              </div>
              {error && <div className="phase12EntryError" role="alert">{error}</div>}
            </div>
          </VelaFlipPage>
        )}

        {step === 2 && (
          <VelaFlipPage pageKey="deep-2" step={2} total={3} label="找出真正卡住的地方">
            <div className="deepReadingStep velaFlipContentCard">
              <div className="deepVelaLine">我先不抽牌。你現在最卡的是哪一種感覺？</div>
              <div className="deepFrictionGrid">
                {FRICTIONS.map((item) => (
                  <button
                    type="button"
                    key={item}
                    className={friction === item ? "isSelected" : ""}
                    onClick={() => setFriction(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <div className="deepReadingActions">
                <button className="ghostButton" type="button" onClick={() => setStep(1)}>翻回上一頁</button>
                <button className="primaryButton" type="button" disabled={!friction} onClick={() => setStep(3)}>讓 Vela 整理</button>
              </div>
            </div>
          </VelaFlipPage>
        )}

        {step === 3 && (
          <VelaFlipPage pageKey="deep-3" step={3} total={3} label="決定怎麼看這件事">
            <div className="deepReadingStep deepReadingPreview velaFlipContentCard">
              <div className="deepVelaLine">好。這件事我不想只丟給你一張牌就結束。</div>
              <h2>Vela 會先用這個脈絡開始</h2>
              <blockquote>{summary}</blockquote>
              <div className="deepReadingStructure">
                <span>接下來的正式 Deep Reading 會由 Vela：</span>
                <strong>先整理矛盾 → 決定閱讀結構 → 讓你抽牌 → 解讀 → 根據你的回答繼續看</strong>
              </div>
              <p className="deepPrototypeNote">這一輪先完成「問題釐清」的可操作原型；付款與正式 entitlement 尚未接入。</p>
              <div className="deepReadingActions">
                <button className="ghostButton" type="button" onClick={() => setStep(2)}>翻回上一頁</button>
                <button className="primaryButton" type="button" onClick={onOpenPlans}>查看 Vela+ 方案</button>
              </div>
            </div>
          </VelaFlipPage>
        )}
      </div>
    </section>
  );
}
