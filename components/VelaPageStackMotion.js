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

function prepareOutgoingPage(page) {
  // React has normally detached the previous page by the time the next page's
  // layout effect runs. Reuse that detached DOM instead of cloning a full page.
  // The clone is only a defensive fallback for an overlapping React commit.
  const ghost = page.isConnected ? page.cloneNode(true) : page;
  ghost.classList.remove("velaFlipPage", "velaFlipEntering");
  ghost.classList.add("velaFlipOutgoingGhost");
  ghost.removeAttribute("id");
  ghost.setAttribute("aria-hidden", "true");
  ghost.inert = true;
  ghost.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
  return ghost;
}

function clearPageStyles(page) {
  if (!page) return;
  gsap.set(page, {
    clearProps: "transform,opacity,visibility,zIndex,willChange",
  });
}

export default function VelaPageStackMotion() {
  useEffect(() => {
    document.documentElement.classList.add("velaDeckMotionReady");

    let activePage = null;
    let activeTimeline = null;
    let activeGhost = null;

    function cleanupActiveAnimation() {
      if (activeTimeline) {
        activeTimeline.kill();
        activeTimeline = null;
      }
      if (activeGhost?.isConnected) activeGhost.remove();
      activeGhost = null;
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

      const nextDeck = nextPage.closest(".velaFlipDeck");
      if (!nextDeck) return;

      cleanupActiveAnimation();
      nextDeck.querySelectorAll(":scope > .velaFlipOutgoingGhost").forEach((node) => node.remove());

      const ghost = prepareOutgoingPage(previousPage);
      activeGhost = ghost;
      nextDeck.prepend(ghost);

      gsap.set(ghost, {
        xPercent: 0,
        y: 0,
        rotation: 0,
        scale: 1,
        autoAlpha: 1,
        zIndex: 4,
        force3D: true,
        transformOrigin: "50% 50%",
        willChange: "transform,opacity",
      });

      gsap.set(nextPage, {
        y: 10,
        scale: 0.986,
        autoAlpha: 0.46,
        zIndex: 2,
        force3D: true,
        willChange: "transform,opacity",
      });

      const timeline = gsap.timeline({
        defaults: { overwrite: "auto" },
        onComplete: () => {
          if (activeGhost === ghost) activeGhost = null;
          if (ghost.isConnected) ghost.remove();
          clearPageStyles(nextPage);
          activeTimeline = null;
        },
      });

      activeTimeline = timeline;

      // One physical idea, split into three lightweight GPU-friendly moves:
      // 1) slide the top page out; 2) drop it behind the stack; 3) bring it back
      // underneath while the newly exposed page settles into focus.
      timeline
        .to(ghost, {
          xPercent: 40,
          y: -7,
          rotation: 2.4,
          scale: 0.99,
          duration: 0.24,
          ease: "power2.inOut",
        }, 0)
        .set(ghost, { zIndex: 1 }, 0.24)
        .to(nextPage, {
          y: 0,
          scale: 1,
          autoAlpha: 1,
          duration: 0.34,
          ease: "power2.out",
        }, 0.19)
        .to(ghost, {
          xPercent: 0,
          y: 12,
          rotation: 0,
          scale: 0.966,
          autoAlpha: 0,
          duration: 0.3,
          ease: "power2.inOut",
        }, 0.25);
    }

    window.addEventListener(VELA_FLIP_PAGE_READY_EVENT, handlePageReady);

    return () => {
      window.removeEventListener(VELA_FLIP_PAGE_READY_EVENT, handlePageReady);
      cleanupActiveAnimation();
      clearPageStyles(activePage);
      document.documentElement.classList.remove("velaDeckMotionReady");
    };
  }, []);

  return null;
}
