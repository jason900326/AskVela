"use client";

import { useState } from "react";

export default function VelaPlusQuestionEntry({ onReady }) {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    const text = question.trim();
    if (loading) return;
    if (text.length < 8) {
      setError("再多說一點點，Vela 才能分辨你真正卡住的是哪一塊。");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/deep-reading/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text }),
      });
      const plan = await response.json();
      if (!response.ok) throw new Error(plan.error || "Vela 現在沒有整理好這個問題。");
      onReady?.({ question: text, plan });
    } catch (err) {
      setError(err.message || "Vela 現在沒有整理好這個問題。");
      setLoading(false);
    }
  }

  return (
    <div className="velaPlusHomeQuestion">
      <div className="velaDialogueBubble phase12HomeBubble velaPlusHomeBubble">
        <span className="velaPlusHomeBadge">✦ VELA+</span>
        <h1>最近有哪件事，你一直放不下？</h1>
        <p>直接說給 Vela 聽。她會先幫你釐清，再決定這次要怎麼看。</p>
      </div>

      <form className="velaPlusHomeForm" onSubmit={submit}>
        <textarea
          rows={5}
          maxLength={700}
          value={question}
          onChange={(event) => {
            setQuestion(event.target.value);
            if (error) setError("");
          }}
          placeholder="不用整理成漂亮的問題。把你現在知道的、在意的、猶豫的都說出來就好。"
          aria-label="告訴 Vela 你想深入看的事情"
        />
        <div className="velaPlusHomeFormFooter">
          <span>{question.length}/700</span>
          <button className="primaryButton" type="submit" disabled={loading || question.trim().length < 8}>
            {loading ? "Vela 正在整理…" : "讓 Vela 先聽懂"}
          </button>
        </div>
        {error && <div className="phase12EntryError" role="alert">{error}</div>}
      </form>
    </div>
  );
}
