"use client";

import { useState } from "react";

export default function VelaPlusQuestionEntry({ onReady, suggestions = [] }) {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function applySuggestion(text) {
    setQuestion(String(text || "").slice(0, 700));
    setError("");
  }

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
    <div className="velaPlusHomeQuestion velaSharedQuestionEntry">
      <div className="velaDialogueBubble phase12HomeBubble velaPlusHomeBubble">
        <span className="velaSharedTrust">免費一張 · 約 60 秒 · 不需註冊</span>
        <h1>最近有什麼事一直放在心上？</h1>
        <p>不用先把問題想得很完整。說給 Vela 聽，她會先抓到你真正卡住的地方。</p>
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
          placeholder="例如：我們最近越來越少說話，我不知道是自己想太多，還是這段關係真的變了。"
          aria-label="告訴 Vela 你想看的事情"
        />
        <div className="velaPlusHomeFormFooter">
          <span>{question.length}/700</span>
          <button className="primaryButton" type="submit" disabled={loading || question.trim().length < 8}>
            {loading ? "Vela 正在整理…" : "讓 Vela 先聽懂"}
          </button>
        </div>
        {error && <div className="phase12EntryError" role="alert">{error}</div>}
      </form>

      {suggestions.length > 0 && (
        <div className="velaHomeSuggestions" aria-label="不知道怎麼問時可以從這裡開始">
          <span>不知道怎麼問？可以先從這些方向開始</span>
          <div>
            {suggestions.map((item) => (
              <button type="button" key={item} onClick={() => applySuggestion(item)}>{item}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
