"use client";

import { useEffect } from "react";
import { gsap } from "gsap";
import { VELA_FLIP_PAGE_READY_EVENT } from "./VelaFlipPage.js";

function isReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
}

function isDrawingRevealBridge(previous, next) {
  return Boolean(
    previous?.querySelector?.(".immersiveDrawingStage.isPreparingReveal")
    && next?.querySelector?.(".immersiveRevealStage"),
  );
}

function createCinematicLayer() {
  const root = document.createElement("div");
  root.className = "velaCinematicTransition";
  root.setAttribute("aria-hidden", "true");
  root.innerHTML = `
    <div class="velaCinematicVeil"></div>
    <div class="velaCinematicLight"></div>
    <div class="velaCinematicVignette"></div>
  `;
  document.body.append(root);
  return root;
}

function clearPageStyles(page) {
  if (!page) return;
  gsap.set(page, { clearProps: "transform,opacity,visibility,zIndex,willChange" });
}

export default function VelaPageStackMotion() {
  useEffect(() => {
    document.documentElement.classList.add("velaDeckMotionReady");

    const layer = createCinematicLayer();
    const veil = layer.querySelector(".velaCinematicVeil");
    const light = layer.querySelector(".velaCinematicLight");
    const vignette = layer.querySelector(".velaCinematicVignette");

    let activePage = null;
    let activeTimeline = null;

    gsap.set(layer, { autoAlpha: 0 });

    function stopTransition() {
      activeTimeline?.kill();
      activeTimeline = null;
      gsap.set(layer, { autoAlpha: 0, clearProps: "pointerEvents" });
      gsap.set([veil, light, vignette], { clearProps: "all" });
      clearPageStyles(activePage);
    }

    function handlePageReady(event) {
      const nextPage = event?.detail?.node;
      if (!(nextPage instanceof HTMLElement) || !nextPage.isConnected) return;
      if (nextPage === activePage) return;

      const previousPage = activePage;
      activePage = nextPage;

      if (!previousPage || isReducedMotion() || isDrawingRevealBridge(previousPage, nextPage)) {
        clearPageStyles(nextPage);
        return;
      }

      activeTimeline?.kill();

      // Keep the page exchange visually continuous without animating a copied DOM
      // tree. The incoming page waits behind a lightweight cinematic veil.
      gsap.set(nextPage, {
        autoAlpha: 0,
        y: 10,
        scale: 0.994,
        force3D: true,
        willChange: "transform,opacity",
      });

      gsap.set(layer, { autoAlpha: 1, pointerEvents: "none" });
      gsap.set(veil, { autoAlpha: 0, scale: 1.035, force3D: true });
      gsap.set(vignette, { autoAlpha: 0 });
      gsap.set(light, { xPercent: -125, autoAlpha: 0, force3D: true });

      const timeline = gsap.timeline({
        defaults: { overwrite: "auto" },
        onComplete: () => {
          clearPageStyles(nextPage);
          gsap.set(layer, { autoAlpha: 0, clearProps: "pointerEvents" });
          activeTimeline = null;
        },
      });
      activeTimeline = timeline;

      // Vela cinematic cut: lower the room light, let a restrained light sweep
      // bridge the edit, then bring the next page into focus. No emblems, cards,
      // spinning rings, or other game-like transition objects.
      timeline
        .to(vignette, {
          autoAlpha: 0.72,
          duration: 0.18,
          ease: "power2.out",
        }, 0)
        .to(veil, {
          autoAlpha: 0.9,
          scale: 1,
          duration: 0.24,
          ease: "power2.inOut",
        }, 0.02)
        .to(light, {
          xPercent: 130,
          autoAlpha: 0.28,
          duration: 0.38,
          ease: "power1.inOut",
        }, 0.08)
        .set(nextPage, { autoAlpha: 1 }, 0.2)
        .to(nextPage, {
          y: 0,
          scale: 1,
          duration: 0.34,
          ease: "power2.out",
        }, 0.2)
        .to(veil, {
          autoAlpha: 0,
          duration: 0.3,
          ease: "power2.out",
        }, 0.24)
        .to(vignette, {
          autoAlpha: 0,
          duration: 0.32,
          ease: "power2.out",
        }, 0.22);
    }

    window.addEventListener(VELA_FLIP_PAGE_READY_EVENT, handlePageReady);

    return () => {
      window.removeEventListener(VELA_FLIP_PAGE_READY_EVENT, handlePageReady);
      stopTransition();
      layer.remove();
      document.documentElement.classList.remove("velaDeckMotionReady");
    };
  }, []);

  return null;
}
