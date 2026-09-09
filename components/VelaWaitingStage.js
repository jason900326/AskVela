"use client";

import { useEffect, useState } from "react";

const NUMBER_NEUTRAL_WAITING_LINES = new Map([
  ["我先看看，哪張牌最先開口。", "我先看看，這次牌面最先想提醒你什麼。"],
  ["我把你剛剛抽到的牌重新放在一起。", "我先把你剛剛抽到的牌理一遍。"],
  ["有一張牌和你問的事對得比預期更直接。", "這次牌面和你問的事對得比預期更直接。"],
  ["我再看看它和旁邊那張是在支持還是拉扯。", "我再看看這次牌面最值得注意的方向。"],
  ["有些地方不是單看一張牌就會看見的。", "有些重點要放回你問的事情裡才會看見。"],
  ["我先看它和原本三張牌哪裡接得上。", "我先看它和原本牌面哪裡接得上。"],
  ["這個回答讓其中一張牌的重點更明顯了。", "這個回答讓這次牌面的重點更明顯了。"],
]);

function normalizeWaitingLine(line) {
  const value = String(line || "");
  return NUMBER_NEUTRAL_WAITING_LINES.get(value) || value;
}

function lineSize(line) {
  const length = [...String(line || "")].length;
  if (length >= 30) return "11px";
  if (length >= 26) return "12px";
  if (length >= 22) return "13px";
  if (length >= 18) return "15px";
  return "clamp(16px, 4.2vw, 24px)";
}

export default function VelaWaitingStage({
  lines = [],
  glyph = "☾",
  intervalMs = 5600,
  className = "",
}) {
  const safeLines = lines.filter(Boolean).map(normalizeWaitingLine);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
    if (safeLines.length <= 1) return undefined;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % safeLines.length);
    }, Math.max(5000, intervalMs));
    return () => window.clearInterval(timer);
  }, [intervalMs, safeLines.length]);

  const line = safeLines[index] || "我再看一下。";

  return (
    <section className={`velaWaitingStage ${className}`.trim()} aria-live="polite" aria-atomic="true">
      <div className="velaWaitingCard">
        <div className="velaWaitingGlyph" aria-hidden="true">{glyph}</div>
        <p
          className="velaWaitingLine"
          key={`${index}-${line}`}
          style={{ fontSize: lineSize(line) }}
        >
          {line}
        </p>
        <div className="velaWaitingProgress" aria-hidden="true"><span /></div>
      </div>
    </section>
  );
}
