"use client";

import { useState } from "react";

export default function VelaStage({ onCrystalClick, awakened = false }) {
  const [loaded, setLoaded] = useState({ hooded: false, revealed: false, crystal: false });

  function markLoaded(key) {
    setLoaded((current) => ({ ...current, [key]: true }));
  }

  return (
    <div className={`velaStage ${awakened ? "isAwake" : ""}`} aria-label="Vela 占卜舞台">
      <div className="velaStageGlow velaStageGlowLeft" aria-hidden="true" />
      <div className="velaStageGlow velaStageGlowRight" aria-hidden="true" />
      <div className="velaStageStars" aria-hidden="true"><i /><i /><i /><i /><i /></div>

      <div className="velaArtFrame">
        <div className={`velaCharacterSlot ${loaded.hooded || loaded.revealed ? "hasArtwork" : ""}`} aria-hidden="true">
          <div className="velaCharacterHalo" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={`velaCharacterArtwork velaHoodedArtwork ${awakened ? "isHidden" : ""}`} src="/images/vela/vela-home-hooded.webp" alt="" draggable="false" onLoad={() => markLoaded("hooded")} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={`velaCharacterArtwork velaRevealedArtwork ${awakened ? "isVisible" : ""}`} src="/images/vela/vela-home-revealed.webp" alt="" draggable="false" onLoad={() => markLoaded("revealed")} />
          <div className="velaCharacterFallback"><div className="velaFallbackHat" /><div className="velaFallbackHead" /><div className="velaFallbackHair velaFallbackHairLeft" /><div className="velaFallbackHair velaFallbackHairRight" /><div className="velaFallbackBody" /></div>
        </div>

        <button className="velaCrystalButton" type="button" onClick={onCrystalClick} aria-label="觸碰水晶球開始">
          <span className="velaCrystalAura" aria-hidden="true" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={`velaCrystalArtwork ${loaded.crystal ? "isLoaded" : ""}`} src="/images/vela/crystal-ball.webp" alt="" draggable="false" onLoad={() => markLoaded("crystal")} />
          <span className="velaCrystalHint">{awakened ? "Vela 正在聽" : "觸碰水晶球開始"}</span>
        </button>
      </div>
    </div>
  );
}
