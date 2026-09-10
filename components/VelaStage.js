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

  function markLoaded(key) {
    setLoaded((current) => (current[key] ? current : { ...current, [key]: true }));
  }

  useEffect(() => {
    const root = stageRef.current;
    if (!root) return undefined;

    if (awakened) {
      root.dataset.introComplete = "true";
      return undefined;
    }

    if (!loaded.hooded || !loaded.crystal || introStartedRef.current) return undefined;

    root.dataset.introReady = "true";
    introStartedRef.current = true;

    if (prefersReducedMotion()) {
      root.dataset.introComplete = "true";
      return undefined;
    }

    const mist = root.querySelector(".velaHomeIntroMist");
    const shade = root.querySelector(".velaHomeIntroMistShade");
    const cloudA = root.querySelector(".velaHomeIntroMistCloudA");
    const cloudB = root.querySelector(".velaHomeIntroMistCloudB");
    const cloudC = root.querySelector(".velaHomeIntroMistCloudC");
    const crystal = root.querySelector(".velaCrystalButton");
    const aura = root.querySelector(".velaCrystalAura");
    const hint = root.querySelector(".velaCrystalHint");

    // The mist overlay exists from the first render, so even cached artwork cannot
    // finish its reveal before the browser has actually painted the cover once.
    gsap.set(mist, { autoAlpha: 1 });
    gsap.set(shade, { autoAlpha: 1 });
    gsap.set(cloudA, { xPercent: -9, yPercent: 2, scale: 1.08, autoAlpha: 0.92, force3D: true });
    gsap.set(cloudB, { xPercent: 10, yPercent: -2, scale: 1.1, autoAlpha: 0.78, force3D: true });
    gsap.set(cloudC, { xPercent: 0, yPercent: 9, scale: 1.1, autoAlpha: 0.52, force3D: true });
    gsap.set(crystal, { y: 8, scale: 0.965, force3D: true });
    gsap.set(aura, { scale: 0.86, autoAlpha: 0.18, force3D: true });
    gsap.set(hint, { y: 6, autoAlpha: 0, force3D: true });

    // useEffect runs after the first paint. One extra animation frame guarantees
    // the visitor sees the mist-covered room before it begins to clear.
    const frame = window.requestAnimationFrame(() => {
      const intro = gsap.timeline({
        defaults: { overwrite: "auto" },
        onComplete: () => {
          root.dataset.introComplete = "true";
          gsap.set([mist, shade, cloudA, cloudB, cloudC, crystal, aura, hint], {
            clearProps: "transform,opacity,visibility,willChange",
          });
          introTimelineRef.current = null;
        },
      });
      introTimelineRef.current = intro;

      intro
        .to(cloudA, {
          xPercent: 54,
          yPercent: -3,
          scale: 1.03,
          autoAlpha: 0,
          duration: 1.08,
          ease: "power2.inOut",
        }, 0.06)
        .to(cloudB, {
          xPercent: -50,
          yPercent: 4,
          scale: 1.02,
          autoAlpha: 0,
          duration: 1.18,
          ease: "power2.inOut",
        }, 0.1)
        .to(cloudC, {
          xPercent: 16,
          yPercent: -16,
          scale: 1.06,
          autoAlpha: 0,
          duration: 1.05,
          ease: "power1.inOut",
        }, 0.18)
        .to(shade, {
          autoAlpha: 0,
          duration: 1.02,
          ease: "power1.out",
        }, 0.16)
        .to(crystal, {
          y: 0,
          scale: 1,
          duration: 0.72,
          ease: "power2.out",
        }, 0.48)
        .to(aura, {
          scale: 1,
          autoAlpha: 1,
          duration: 0.78,
          ease: "power1.out",
        }, 0.52)
        .to(hint, {
          y: 0,
          autoAlpha: 1,
          duration: 0.46,
          ease: "power2.out",
        }, 0.92)
        .to(mist, {
          autoAlpha: 0,
          duration: 0.3,
          ease: "power1.out",
        }, 1.02);
    });

    return () => {
      window.cancelAnimationFrame(frame);
      introTimelineRef.current?.kill();
      introTimelineRef.current = null;
    };
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

      {!awakened && (
        <div className="velaHomeIntroMist" aria-hidden="true">
          <span className="velaHomeIntroMistShade" />
          <span className="velaHomeIntroMistCloud velaHomeIntroMistCloudA" />
          <span className="velaHomeIntroMistCloud velaHomeIntroMistCloudB" />
          <span className="velaHomeIntroMistCloud velaHomeIntroMistCloudC" />
        </div>
      )}
    </div>
  );
}
