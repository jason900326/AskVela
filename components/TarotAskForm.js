"use client";

import { useState } from "react";

const EXAMPLES = [
  "The High Priestess 在 Waite 原書中代表什麼？",
  "The Tower 的正位與逆位有什麼差別？",
  "Waite 如何描述 The Fool 的象徵？",
];

export default function TarotAskForm() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function ask(event) {
    event?.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError("");
    setAnswer("");
    setSources([]);

    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed, tarotSystem: "Rider-Waite-Smith" }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "目前無法取得回答。");

      setAnswer(data.answer || "沒有取得回答。");
      setSources(data.sources || []);
    } catch (err) {
      setError(err.message || "發生未知錯誤。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="askPanel">
      <div className="panelHeading">
        <div>
          <div className="eyebrow">RIDER–WAITE–SMITH</div>
          <h2>問 Vela 一個塔羅問題</h2>
        </div>
        <div className="statusDot"><i /> RAG PIPELINE</div>
      </div>

      <form onSubmit={ask}>
        <textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="例如：The Hermit 在 Waite 的原始牌義中象徵什麼？"
          rows={5}
          maxLength={1200}
        />
        <div className="askActions">
          <span>{question.length}/1200</span>
          <button type="submit" disabled={loading || !question.trim()}>
            {loading ? "正在查閱原書…" : "Ask Vela"}
          </button>
        </div>
      </form>

      <div className="examples">
        {EXAMPLES.map((example) => (
          <button key={example} type="button" onClick={() => setQuestion(example)}>
            {example}
          </button>
        ))}
      </div>

      {error && <div className="errorBox">{error}</div>}

      {answer && (
        <div className="answerBox">
          <div className="eyebrow">VELA&apos;S ANSWER</div>
          <div className="answerText">{answer}</div>

          {sources.length > 0 && (
            <div className="sources">
              <h3>本次參考來源</h3>
              {sources.map((source) => (
                <div className="sourceItem" key={`${source.book}-${source.chunkIndex}`}>
                  <strong>{source.book}</strong>
                  <span>
                    {source.author ? `${source.author} · ` : ""}
                    chunk {source.chunkIndex}
                    {typeof source.similarity === "number"
                      ? ` · relevance ${Math.round(source.similarity * 100)}%`
                      : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
