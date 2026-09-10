"use client";

import { useEffect } from "react";

function getActivePage() {
  return document.querySelector(".velaFlipPage");
}

function isReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
}

function isDrawingRevealBridge(previous, next) {
  return Boolean(
    previous?.querySelector?.(".immersiveDrawingStage.isPreparingReveal")
    && next?.querySelector?.(".immersiveRevealStage"),
  );
}

function makeOutgoingGhost(page) {
  const ghost = page.cloneNode(true);
  ghost.classList.remove("velaFlipPage", "velaFlipEntering");
  ghost.classList.add("velaFlipOutgoingGhost");
  ghost.setAttribute("aria-hidden", "true");

  ghost.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
  ghost.querySelectorAll("button, a, input, textarea, select, [tabindex]").forEach((node) => {
    node.setAttribute("tabindex", "-1");
    node.setAttribute("aria-hidden", "true");
    if ("disabled" in node) node.disabled = true;
  });

  return ghost;
}

export default function VelaPageStackMotion() {
  useEffect(() => {
    document.documentElement.classList.add("velaDeckMotionReady");

    let activePage = getActivePage();
    const cleanupTimers = new Set();

    const observer = new MutationObserver(() => {
      const nextPage = getActivePage();
      if (!nextPage || nextPage === activePage) return;

      const previousPage = activePage;
      activePage = nextPage;

      if (!previousPage || isReducedMotion() || isDrawingRevealBridge(previousPage, nextPage)) return;

      const nextDeck = nextPage.closest(".velaFlipDeck");
      if (!nextDeck) return;

      nextDeck.querySelectorAll(":scope > .velaFlipOutgoingGhost").forEach((node) => node.remove());

      const ghost = makeOutgoingGhost(previousPage);
      nextDeck.prepend(ghost);

      nextPage.classList.remove("velaFlipEntering");
      void nextPage.offsetWidth;
      nextPage.classList.add("velaFlipEntering");

      let cleaned = false;
      const cleanup = () => {
        if (cleaned) return;
        cleaned = true;
        ghost.remove();
        nextPage.classList.remove("velaFlipEntering");
      };

      ghost.addEventListener("animationend", cleanup, { once: true });
      const timer = window.setTimeout(() => {
        cleanupTimers.delete(timer);
        cleanup();
      }, 950);
      cleanupTimers.add(timer);
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      cleanupTimers.forEach((timer) => window.clearTimeout(timer));
      document.documentElement.classList.remove("velaDeckMotionReady");
    };
  }, []);

  return null;
}
