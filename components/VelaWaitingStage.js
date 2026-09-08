"use client";

import { useEffect, useState } from "react";

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
  const safeLines = lines.filter(Boolean);
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
