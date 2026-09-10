"use client";

import { useState } from "react";

const GUIDED_CHOICES = [
  { label: "今天的提醒", question: "今天的我最需要注意什麼？" },
  { label: "感情", question: "最近的感情有什麼提醒？" },
  { label: "工作／學業", question: "工作／學業現在最值得留意什麼？" },
  { label: "我可能忽略的事", question: "我現在最容易忽略什麼？" },
  { label: "接下來幾天", question: "接下來幾天，我該把注意力放在哪裡？" },
  { label: "現在最需要聽見的話", question: "現在的我最需要聽見什麼？" },
];

export default function VelaQuestionHelp({ onReady, onBack, onAstrology, onDream }) {
  const [loadingQuestion, setLoadingQuestion] = useState("");
  const [error, setError] = useState("");

  async function choose(question) {
    if (loadingQuestion) return;
    setLoadingQuestion(question);
    setError("");

    try {
      const response = await fetch("/api/deep-reading/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const plan = await response.json();
      if (!response.ok) throw new Error(plan.error || "Vela 現在沒有整理好這個方向。");
      onReady?.({ question, plan });
    } catch (err) {
      setError(err.message || "Vela 現在沒有整理好這個方向。");
      setLoadingQuestion("");
    }
  }

  return (
    <div className="velaQuestionHelp">
      <div className="velaDialogueBubble phase12HomeBubble velaQuestionHelpBubble">
        <h1>先選一個最接近的方向。</h1>
        <p>不用再回去打字。點下去後，Vela 就會直接從這裡開始問。</p>
      </div>

      <div className="velaQuestionHelpGrid" aria-label="選擇想看的方向">
        {GUIDED_CHOICES.map((item) => (
          <button
            type="button"
            key={item.question}
            disabled={Boolean(loadingQuestion)}
            onClick={() => choose(item.question)}
          >
            <strong>{item.label}</strong>
            {loadingQuestion === item.question && <span>Vela 正在整理…</span>}
          </button>
        ))}
      </div>

      <section className="velaQuestionHelpOther" aria-label="其他占卜方式">
        <span>或直接前往</span>
        <div>
          <button type="button" disabled={Boolean(loadingQuestion)} onClick={onAstrology}>
            <b>◎</b><strong>星座運勢</strong>
          </button>
          <button type="button" disabled={Boolean(loadingQuestion)} onClick={onDream}>
            <b>☾</b><strong>解夢</strong>
          </button>
        </div>
      </section>

      {error && <div className="phase12EntryError" role="alert">{error}</div>}
      <button className="deepTextBack velaQuestionHelpBack" type="button" onClick={onBack}>我想自己說</button>
    </div>
  );
}
