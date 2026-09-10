"use client";

import { useEffect } from "react";
import { gsap } from "gsap";
import { VELA_FLIP_PAGE_READY_EVENT } from "./VelaFlipPage.js";

const CARD_BACK = "/images/vela/tarot-card-back.webp";

function isReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
}

function isDrawingRevealBridge(previous, next) {
  return Boolean(
    previous?.querySelector?.(".immersiveDrawingStage.isPreparingReveal")
    && next?.querySelector?.(".immersiveRevealStage"),
  );
}

function createEclipseLayer() {
  const root = document.createElement("div");
  root.className = "velaEclipseTransition";
  root.setAttribute("aria-hidden", "true");
  root.innerHTML = `
    <div class="velaEclipseVeil"></div>
    <div class="velaEclipseSeal">
      <span class="velaEclipseOrbit"></span>
      <span class="velaEclipseOrbit velaEclipseOrbitSecondary"></span>
      <img class="velaEclipseCard" src="${CARD_BACK}" alt="" draggable="false" />
      <span class="velaEclipseGleam"></span>
    </div>
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

    const layer = createEclipseLayer();
    const veil = layer.querySelector(".velaEclipseVeil");
    const seal = layer.querySelector(".velaEclipseSeal");
    const card = layer.querySelector(".velaEclipseCard");
    const orbit = layer.querySelector(".velaEclipseOrbit");
    const orbitSecondary = layer.querySelector(".velaEclipseOrbitSecondary");
    const gleam = layer.querySelector(".velaEclipseGleam");

    let activePage = null;
    let activeTimeline = null;

    gsap.set(layer, { autoAlpha: 0 });

    function stopTransition() {
      activeTimeline?.kill();
      activeTimeline = null;
      gsap.set(layer, { autoAlpha: 0, clearProps: "pointerEvents" });
      gsap.set([veil, seal, card, orbit, orbitSecondary, gleam], { clearProps: "all" });
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

      // The incoming page is prepared before paint. The eclipse layer is a
      // lightweight visual bridge; we never clone or re-layout the outgoing page.
      gsap.set(nextPage, {
        autoAlpha: 0,
        y: 14,
        scale: 0.992,
        force3D: true,
        willChange: "transform,opacity",
      });

      gsap.set(layer, { autoAlpha: 1, pointerEvents: "none" });
      gsap.set(veil, {
        scaleX: 0,
        transformOrigin: "50% 50%",
        force3D: true,
      });
      gsap.set(seal, { autoAlpha: 0, scale: 0.72, rotation: -4, force3D: true });
      gsap.set(card, { y: 10, rotationY: -10, scale: 0.94, force3D: true });
      gsap.set(orbit, { scale: 0.74, rotation: -26, autoAlpha: 0 });
      gsap.set(orbitSecondary, { scale: 0.86, rotation: 18, autoAlpha: 0 });
      gsap.set(gleam, { xPercent: -150, autoAlpha: 0 });

      const timeline = gsap.timeline({
        defaults: { overwrite: "auto" },
        onComplete: () => {
          clearPageStyles(nextPage);
          gsap.set(layer, { autoAlpha: 0, clearProps: "pointerEvents" });
          activeTimeline = null;
        },
      });
      activeTimeline = timeline;

      // Vela Eclipse: close the veil, let the tarot seal appear at totality,
      // then open directly onto the next page. Only transform/opacity animate.
      timeline
        .to(veil, {
          scaleX: 1,
          duration: 0.2,
          ease: "power3.inOut",
        }, 0)
        .to(seal, {
          autoAlpha: 1,
          scale: 1,
          rotation: 0,
          duration: 0.22,
          ease: "back.out(1.35)",
        }, 0.1)
        .to(card, {
          y: 0,
          rotationY: 0,
          scale: 1,
          duration: 0.24,
          ease: "power2.out",
        }, 0.1)
        .to([orbit, orbitSecondary], {
          autoAlpha: 0.88,
          scale: 1,
          rotation: 0,
          duration: 0.22,
          stagger: 0.025,
          ease: "power2.out",
        }, 0.12)
        .to(gleam, {
          xPercent: 145,
          autoAlpha: 0.72,
          duration: 0.22,
          ease: "power1.inOut",
        }, 0.2)
        .set(nextPage, { autoAlpha: 1 }, 0.31)
        .to(nextPage, {
          y: 0,
          scale: 1,
          duration: 0.28,
          ease: "power2.out",
        }, 0.31)
        .to(seal, {
          autoAlpha: 0,
          scale: 1.08,
          duration: 0.16,
          ease: "power2.in",
        }, 0.34)
        .to(veil, {
          scaleX: 0,
          transformOrigin: "100% 50%",
          duration: 0.24,
          ease: "power3.inOut",
        }, 0.36);
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
