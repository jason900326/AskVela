"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";

function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
}

export default function VelaStage({ onCrystalClick, awakened = false }) {
  const stageRef = useRef(null);
  const introStartedRef = useRef(false);
  const introTimelineRef = useRef(null);
  const [loaded, setLoaded] = useState({ hooded: false, revealed: false, crystal: false });
  const [introComplete, setIntroComplete] = useState(false);

  function markLoaded(key) {
    setLoaded((current) => (current[key] ? current : { ...current, [key]: true }));
  }

  useEffect(() => {
    const root = stageRef.current;
    if (!root || awakened) return undefined;
    if (!loaded.hooded || !loaded.crystal || introStartedRef.current) return undefined;

    introStartedRef.current = true;

    if (prefersReducedMotion()) {
      setIntroComplete(true);
      return undefined;
    }

    const artwork = root.querySelector(".velaHoodedArtwork");
    const crystalArtwork = root.querySelector(".velaCrystalArtwork");
    const aura = root.querySelector(".velaCrystalAura");
    const hint = root.querySelector(".velaCrystalHint");
    const glows = root.querySelectorAll(".velaStageGlow");
    const stars = root.querySelectorAll(".velaStageStars i");

    // Nothing blocks first paint. Vela is already visible in a quieter state,
    // then resolves into focus once the two key images are truly ready.
    const frame = window.requestAnimationFrame(() => {
      const intro = gsap.timeline({
        defaults: { overwrite: "auto" },
        onComplete: () => {
          setIntroComplete(true);
          gsap.set([artwork, crystalArtwork, aura, hint, ...glows, ...stars], {
            clearProps: "transform,opacity,visibility,willChange",
          });
          introTimelineRef.current = null;
        },
      });
      introTimelineRef.current = intro;

      intro
        .to(glows, {
          autoAlpha: 1,
          duration: 0.95,
          ease: "power1.out",
        }, 0)
        .to(stars, {
          autoAlpha: 0.78,
          duration: 0.82,
          stagger: 0.055,
          ease: "power1.out",
        }, 0.06)
        .to(artwork, {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          duration: 1.02,
          ease: "power2.out",
        }, 0.04)
        .to(crystalArtwork, {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          duration: 0.76,
          ease: "power2.out",
        }, 0.34)
        .to(aura, {
          autoAlpha: 1,
          scale: 1,
          duration: 0.8,
          ease: "power1.out",
        }, 0.38)
        .to(hint, {
          autoAlpha: 1,
          y: 0,
          duration: 0.46,
          ease: "power2.out",
        }, 0.76);
    });

    return () => {
      window.cancelAnimationFrame(frame);
      introTimelineRef.current?.kill();
      introTimelineRef.current = null;
    };
  }, [awakened, loaded.crystal, loaded.hooded]);

  const introPending = !awakened && !introComplete;

  return (
    <div ref={stageRef} className={`velaStage ${awakened ? "isAwake" : ""} ${introPending ? "isIntroPending" : ""}`.trim()} aria-label="Vela 占卜舞台">
      <div className="velaStageGlow velaStageGlowLeft" aria-hidden="true" />
      <div className="velaStageGlow velaStageGlowRight" aria-hidden="true" />
      <div className="velaStageStars" aria-hidden="true"><i /><i /><i /><i /><i /></div>

      <div className="velaArtFrame">
        <div className={`velaCharacterSlot ${loaded.hooded || loaded.revealed ? "hasArtwork" : ""}`} aria-hidden="true">
          <div className="velaCharacterHalo" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={`velaCharacterArtwork velaHoodedArtwork ${awakened ? "isHidden" : ""}`} src="/images/vela/vela-home-hooded.webp" alt="" draggable="false" onLoad={() => markLoaded("hooded")} onError={() => markLoaded("hooded")} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={`velaCharacterArtwork velaRevealedArtwork ${awakened ? "isVisible" : ""}`} src="/images/vela/vela-home-revealed.webp" alt="" draggable="false" onLoad={() => markLoaded("revealed")} onError={() => markLoaded("revealed")} />
          <div className="velaCharacterFallback"><div className="velaFallbackHat" /><div className="velaFallbackHead" /><div className="velaFallbackHair velaFallbackHairLeft" /><div className="velaFallbackHair velaFallbackHairRight" /><div className="velaFallbackBody" /></div>
        </div>

        <button className="velaCrystalButton" type="button" onClick={onCrystalClick} aria-label={awakened ? "Vela 的水晶球" : "觸碰水晶球開始"} disabled={awakened}>
          <span className="velaCrystalAura" aria-hidden="true" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={`velaCrystalArtwork ${loaded.crystal ? "isLoaded" : ""}`} src="/images/vela/crystal-ball.webp" alt="" draggable="false" onLoad={() => markLoaded("crystal")} onError={() => markLoaded("crystal")} />
          {!awakened && <span className="velaCrystalHint">觸碰水晶球開始</span>}
        </button>
      </div>
    </div>
  );
}
