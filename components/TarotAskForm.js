"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const EXAMPLES = [
  "The High Priestess 在 Waite 原書中代表什麼？",
  "The Tower 的正位與逆位有什麼差別？",
  "Waite 如何描述 The Fool 的象徵？",
];

const SECTION_LABELS = {
  description_symbolism: "牌面與象徵",
  divinatory_meaning: "占卜牌義",
  additional_divinatory_meaning: "補充牌義",
};

const ORIENTATION_LABELS = {
  upright: "正位",
  reversed: "逆位",
};

function formatPageRange(sourceLocation) {
  const start = sourceLocation?.pdf_page_start;
  const end = sourceLocation?.pdf_page_end;
  if (!start) return null;
  return end && end !== start ? `PDF 第 ${start}–${end} 頁` : `PDF 第 ${start} 頁`;
}

function formatPassage(source) {
  return [
    source.cardNameZhTw || source.cardName,
    ORIENTATION_LABELS[source.orientation],
    SECTION_LABELS[source.sectionType] || source.sectionType,
    formatPageRange(source.sourceLocation),
  ].filter(Boolean).join(" · ");
}

function groupSources(sources) {
  const groups = new Map();

  sources.forEach((source) => {
    const key = `${source.book}\u0000${source.author || ""}`;
    const group = groups.get(key) || {
      book: source.book,
      author: source.author,
      passages: [],
      seen: new Set(),
    };
    const passage = formatPassage(source);

    if (!group.seen.has(passage)) {
      group.seen.add(passage);
      group.passages.push(passage);
    }
    groups.set(key, group);
  });

  return Array.from(groups.values());
}

export default function TarotAskForm() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const groupedSources = groupSources(sources);

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
          <div className="answerText">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{answer}</ReactMarkdown>
          </div>

          {groupedSources.length > 0 && (
            <div className="sources">
              <h3>本次參考來源</h3>
              {groupedSources.map((source) => (
                <div className="sourceItem" key={`${source.book}-${source.author || ""}`}>
                  <div className="sourceHeading">
                    <strong>{source.book}</strong>
                    {source.author && <span>{source.author}</span>}
                  </div>
                  <ul>
                    {source.passages.map((passage) => (
                      <li key={passage}>{passage}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
