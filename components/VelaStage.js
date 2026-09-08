"use client";

import { useState } from "react";

const DEFAULT_VELA_ART = "/images/vela/vela-home.webp";

export default function VelaStage({ onCrystalClick, artSrc = DEFAULT_VELA_ART }) {
  const [artLoaded, setArtLoaded] = useState(false);

  return (
    <div className="velaStage" aria-label="Vela 占卜舞台">
      <div className="velaStageGlow velaStageGlowLeft" aria-hidden="true" />
      <div className="velaStageGlow velaStageGlowRight" aria-hidden="true" />
      <div className="velaStageStars" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
        <i />
      </div>

      <div className="velaArtFrame">
        <div className={`velaCharacterSlot ${artLoaded ? "hasArtwork" : ""}`} aria-hidden="true">
          <div className="velaCharacterHalo" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="velaCharacterArtwork"
            src={artSrc}
            alt=""
            draggable="false"
            onLoad={() => setArtLoaded(true)}
            onError={() => setArtLoaded(false)}
          />
          <div className="velaCharacterFallback">
            <div className="velaFallbackHat" />
            <div className="velaFallbackHead" />
            <div className="velaFallbackHair velaFallbackHairLeft" />
            <div className="velaFallbackHair velaFallbackHairRight" />
            <div className="velaFallbackBody" />
          </div>
        </div>

        <button
          className="velaCrystalButton"
          type="button"
          onClick={onCrystalClick}
          aria-label="點水晶球，開始告訴 Vela 你最近在意的事"
        >
          <span className="velaCrystalAura" aria-hidden="true" />
          <span className="velaCrystalBall" aria-hidden="true">
            <span className="velaCrystalMist" />
            <span className="velaCrystalStar">✦</span>
          </span>
          <span className="velaCrystalBase" aria-hidden="true" />
          <span className="velaCrystalHint">點水晶球開始</span>
        </button>
      </div>

      <div className="velaTable" aria-hidden="true">
        <span className="velaTableEdge" />
      </div>
    </div>
  );
}
