"use client";

import { useEffect, useState } from "react";
import AstrologyReadingFlow from "./AstrologyReadingFlow.js";
import TarotReadingFlow from "./TarotReadingFlow.js";

export default function VelaExperience() {
  const [experience, setExperience] = useState("tarot");

  useEffect(() => {
    function handleExperience(event) {
      if (["tarot", "astrology"].includes(event?.detail)) setExperience(event.detail);
    }
    window.addEventListener("vela:experience", handleExperience);
    return () => window.removeEventListener("vela:experience", handleExperience);
  }, []);

  return (
    <section className="velaExperienceHub">
      <nav className="experienceTabs" aria-label="選擇 Vela 功能">
        <button type="button" className={experience === "tarot" ? "isActive" : ""} onClick={() => setExperience("tarot")} aria-pressed={experience === "tarot"}>
          <span aria-hidden="true">🔮</span><strong>塔羅</strong><small>Tarot</small>
        </button>
        <button type="button" className={experience === "astrology" ? "isActive" : ""} onClick={() => setExperience("astrology")} aria-pressed={experience === "astrology"}>
          <span aria-hidden="true">✦</span><strong>星座</strong><small>Astrology</small>
        </button>
        <button type="button" disabled aria-disabled="true" title="Phase 8 開放">
          <span aria-hidden="true">☾</span><strong>解夢</strong><small>Phase 8</small>
        </button>
      </nav>

      {experience === "astrology"
        ? <AstrologyReadingFlow onExperienceChange={setExperience} />
        : <TarotReadingFlow onExperienceChange={setExperience} />}
    </section>
  );
}
