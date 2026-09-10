"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";

function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
}

export default function VelaStage({ onCrystalClick, awakened = false }) {
  const stageRef = useRef(null);
  const [loaded, setLoaded] = useState({ hooded: false, revealed: false, crystal: false });

  function markLoaded(key) {
    setLoaded((current) => ({ ...current, [key]: true }));
  }

  useLayoutEffect(() => {
    const root = stageRef.current;
    if (!root || awakened || !loaded.hooded || !loaded.crystal) return undefined;

    root.dataset.introReady = "true";

    if (prefersReducedMotion()) {
      root.dataset.introComplete = "true";
      return undefined;
    }

    const context = gsap.context(() => {
      const character = root.querySelector(".velaCharacterSlot");
      const crystal = root.querySelector(".velaCrystalButton");
      const hint = root.querySelector(".velaCrystalHint");
      const glows = root.querySelectorAll(".velaStageGlow");
      const stars = root.querySelectorAll(".velaStageStars i");

      gsap.set(character, { autoAlpha: 0, y: 18, scale: 0.992, force3D: true });
      gsap.set(crystal, { autoAlpha: 0, y: 12, scale: 0.94, force3D: true });
      gsap.set(hint, { autoAlpha: 0, y: 5, force3D: true });
      gsap.set(glows, { autoAlpha: 0 });
      gsap.set(stars, { autoAlpha: 0, y: 4, force3D: true });

      const intro = gsap.timeline({
        defaults: { overwrite: "auto" },
        onComplete: () => {
          root.dataset.introComplete = "true";
          gsap.set([character, crystal, hint, ...glows, ...stars], {
            clearProps: "transform,opacity,visibility,willChange",
          });
        },
      });

      intro
        .to(glows, {
          autoAlpha: 1,
          duration: 1.05,
          ease: "power1.out",
        }, 0)
        .to(stars, {
          autoAlpha: 0.78,
          y: 0,
          duration: 0.75,
          stagger: 0.07,
          ease: "power1.out",
        }, 0.08)
        .to(character, {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          duration: 0.9,
          ease: "power2.out",
        }, 0.12)
        .to(crystal, {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          duration: 0.72,
          ease: "power2.out",
        }, 0.48)
        .to(hint, {
          autoAlpha: 1,
          y: 0,
          duration: 0.42,
          ease: "power2.out",
        }, 0.9);
    }, root);

    return () => context.revert();
  }, [awakened, loaded.crystal, loaded.hooded]);

  return (
    <div ref={stageRef} className={`velaStage ${awakened ? "isAwake" : ""}`} aria-label="Vela 占卜舞台">
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

        <button className="velaCrystalButton" type="button" onClick={onCrystalClick} aria-label={awakened ? "Vela 的水晶球" : "觸碰水晶球開始"} disabled={awakened}>
          <span className="velaCrystalAura" aria-hidden="true" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={`velaCrystalArtwork ${loaded.crystal ? "isLoaded" : ""}`} src="/images/vela/crystal-ball.webp" alt="" draggable="false" onLoad={() => markLoaded("crystal")} />
          {!awakened && <span className="velaCrystalHint">觸碰水晶球開始</span>}
        </button>
      </div>
    </div>
  );
}
