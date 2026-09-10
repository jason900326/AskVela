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

function createDissolveLayer() {
  const root = document.createElement("div");
  root.className = "velaDissolveTransition";
  root.setAttribute("aria-hidden", "true");
  document.body.append(root);
  return root;
}

function clearPageStyles(page) {
  if (!page) return;
  gsap.set(page, { clearProps: "transform,opacity,visibility,zIndex,willChange" });
}

function validRect(rect) {
  return rect && rect.width > 1 && rect.height > 1;
}

export default function VelaPageStackMotion() {
  useEffect(() => {
    document.documentElement.classList.add("velaDeckMotionReady");

    const layer = createDissolveLayer();
    let activePage = null;
    let activeRect = null;
    let activeTimeline = null;
    let outgoingPage = null;

    function cleanupOutgoing() {
      if (outgoingPage?.isConnected) outgoingPage.remove();
      outgoingPage = null;
    }

    function stopTransition() {
      activeTimeline?.kill();
      activeTimeline = null;
      cleanupOutgoing();
      clearPageStyles(activePage);
    }

    function handlePageReady(event) {
      const nextPage = event?.detail?.node;
      if (!(nextPage instanceof HTMLElement) || !nextPage.isConnected) return;
      if (nextPage === activePage) return;

      const previousPage = activePage;
      const previousRect = activeRect;
      activePage = nextPage;
      activeRect = nextPage.getBoundingClientRect();

      if (!previousPage || isReducedMotion() || isDrawingRevealBridge(previousPage, nextPage)) {
        clearPageStyles(nextPage);
        return;
      }

      activeTimeline?.kill();
      cleanupOutgoing();

      // React normally detaches the outgoing page before the incoming layout
      // effect fires. Reuse that exact detached node as a short-lived visual
      // afterimage; never clone the page and never cover the viewport with a
      // loading-looking veil.
      if (!previousPage.isConnected && validRect(previousRect)) {
        outgoingPage = previousPage;
        outgoingPage.classList.add("velaDissolveOutgoing");
        outgoingPage.setAttribute("aria-hidden", "true");
        outgoingPage.inert = true;
        layer.append(outgoingPage);

        gsap.set(outgoingPage, {
          position: "fixed",
          left: previousRect.left,
          top: previousRect.top,
          width: previousRect.width,
          height: previousRect.height,
          margin: 0,
          autoAlpha: 1,
          y: 0,
          scale: 1,
          zIndex: 2,
          force3D: true,
          transformOrigin: "50% 50%",
          willChange: "transform,opacity",
        });
      }

      const hasOutgoing = Boolean(outgoingPage);
      gsap.set(nextPage, {
        autoAlpha: hasOutgoing ? 0.18 : 0.72,
        y: 8,
        scale: 0.992,
        force3D: true,
        willChange: "transform,opacity",
      });

      const timeline = gsap.timeline({
        defaults: { overwrite: "auto" },
        onComplete: () => {
          cleanupOutgoing();
          clearPageStyles(nextPage);
          activeRect = nextPage.getBoundingClientRect();
          activeTimeline = null;
        },
      });
      activeTimeline = timeline;

      // A restrained optical dissolve: the old scene recedes by only a few
      // pixels while the new scene resolves forward underneath it. There is no
      // full-screen transition object, so the interface never resembles a
      // loading or frozen state.
      if (outgoingPage) {
        timeline.to(outgoingPage, {
          autoAlpha: 0,
          y: -6,
          scale: 0.996,
          duration: 0.36,
          ease: "power1.inOut",
        }, 0);
      }

      timeline.to(nextPage, {
        autoAlpha: 1,
        y: 0,
        scale: 1,
        duration: 0.42,
        ease: "power2.out",
      }, hasOutgoing ? 0.045 : 0);
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
