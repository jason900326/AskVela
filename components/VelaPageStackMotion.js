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

function createMistLayer() {
  const root = document.createElement("div");
  root.className = "velaMistTransition";
  root.setAttribute("aria-hidden", "true");
  root.innerHTML = `
    <div class="velaMistDim"></div>
    <div class="velaMistCloud velaMistCloudA"></div>
    <div class="velaMistCloud velaMistCloudB"></div>
    <div class="velaMistCloud velaMistCloudC"></div>
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

    const layer = createMistLayer();
    const dim = layer.querySelector(".velaMistDim");
    const cloudA = layer.querySelector(".velaMistCloudA");
    const cloudB = layer.querySelector(".velaMistCloudB");
    const cloudC = layer.querySelector(".velaMistCloudC");

    let activePage = null;
    let activeTimeline = null;

    gsap.set(layer, { autoAlpha: 0 });

    function stopTransition() {
      activeTimeline?.kill();
      activeTimeline = null;
      gsap.set(layer, { autoAlpha: 0 });
      gsap.set([dim, cloudA, cloudB, cloudC], { clearProps: "all" });
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

      // The incoming page is prepared in the layout phase. A lightweight set of
      // gradient fog layers covers the visual cut, so no outgoing DOM clone,
      // forced reflow, canvas, or animated blur is required.
      gsap.set(nextPage, {
        autoAlpha: 0,
        y: 8,
        scale: 0.996,
        force3D: true,
        willChange: "transform,opacity",
      });

      // Start with a faint darkened atmosphere on the very first painted frame,
      // then let three mist banks cross at different speeds.
      gsap.set(layer, { autoAlpha: 1, pointerEvents: "none" });
      gsap.set(dim, { autoAlpha: 0.34 });
      gsap.set(cloudA, { xPercent: -58, yPercent: 2, scale: 1.05, autoAlpha: 0.18, force3D: true });
      gsap.set(cloudB, { xPercent: 58, yPercent: -3, scale: 1.08, autoAlpha: 0.14, force3D: true });
      gsap.set(cloudC, { xPercent: -16, yPercent: 18, scale: 1.12, autoAlpha: 0.08, force3D: true });

      const timeline = gsap.timeline({
        defaults: { overwrite: "auto" },
        onComplete: () => {
          clearPageStyles(nextPage);
          gsap.set(layer, { autoAlpha: 0 });
          activeTimeline = null;
        },
      });
      activeTimeline = timeline;

      // Vela Mist: fog gathers from both sides, hides the edit at its densest
      // moment, then drifts apart while the next page quietly settles forward.
      timeline
        .to(dim, {
          autoAlpha: 0.58,
          duration: 0.2,
          ease: "power1.out",
        }, 0)
        .to(cloudA, {
          xPercent: -3,
          yPercent: 0,
          scale: 1,
          autoAlpha: 0.82,
          duration: 0.34,
          ease: "power2.out",
        }, 0)
        .to(cloudB, {
          xPercent: 4,
          yPercent: 1,
          scale: 1,
          autoAlpha: 0.68,
          duration: 0.36,
          ease: "power2.out",
        }, 0.035)
        .to(cloudC, {
          xPercent: 0,
          yPercent: 2,
          scale: 1,
          autoAlpha: 0.46,
          duration: 0.32,
          ease: "power1.out",
        }, 0.075)
        .set(nextPage, { autoAlpha: 1 }, 0.25)
        .to(nextPage, {
          y: 0,
          scale: 1,
          duration: 0.36,
          ease: "power2.out",
        }, 0.25)
        .to(cloudA, {
          xPercent: 46,
          yPercent: -4,
          scale: 1.03,
          autoAlpha: 0,
          duration: 0.38,
          ease: "power2.inOut",
        }, 0.29)
        .to(cloudB, {
          xPercent: -42,
          yPercent: 5,
          scale: 1.02,
          autoAlpha: 0,
          duration: 0.4,
          ease: "power2.inOut",
        }, 0.3)
        .to(cloudC, {
          xPercent: 14,
          yPercent: -18,
          scale: 1.06,
          autoAlpha: 0,
          duration: 0.38,
          ease: "power1.inOut",
        }, 0.31)
        .to(dim, {
          autoAlpha: 0,
          duration: 0.36,
          ease: "power1.out",
        }, 0.32);
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
