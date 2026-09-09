"use client";

import { useEffect } from "react";

const HISTORY_MARKER = "__askVelaHistoryOverlay";

function historyOverlayOpen() {
  return Boolean(document.querySelector(".historyOverlay .historyPanel"));
}

function historyCloseButton() {
  return document.querySelector(".historyOverlay .historyHeader .accountClose");
}

function pushHistoryMarker() {
  const current = window.history.state;
  const base = current && typeof current === "object" ? current : {};
  window.history.pushState({ ...base, [HISTORY_MARKER]: true }, "", window.location.href);
}

export default function VelaHistoryNavigationGuard() {
  useEffect(() => {
    let armed = false;
    let closingFromPopState = false;
    let sawOverlay = false;

    const syncOverlayState = () => {
      const open = historyOverlayOpen();

      if (open) {
        sawOverlay = true;
        if (!armed && !closingFromPopState) {
          if (!window.history.state?.[HISTORY_MARKER]) pushHistoryMarker();
          armed = true;
        }
        return;
      }

      if (!sawOverlay) return;
      sawOverlay = false;

      if (closingFromPopState) {
        closingFromPopState = false;
        armed = false;
        return;
      }

      // The in-app close button should consume the synthetic history entry too,
      // so the next browser Back/edge-swipe does not jump to an OAuth/login page.
      if (armed && window.history.state?.[HISTORY_MARKER]) {
        armed = false;
        window.history.back();
      } else {
        armed = false;
      }
    };

    const observer = new MutationObserver(() => {
      queueMicrotask(syncOverlayState);
    });

    const handlePopState = () => {
      if (!historyOverlayOpen()) return;
      closingFromPopState = true;
      armed = false;
      historyCloseButton()?.click();
    };

    const handleKeyDown = (event) => {
      if (event.key !== "Escape" || !historyOverlayOpen()) return;
      event.preventDefault();
      historyCloseButton()?.click();
    };

    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("keydown", handleKeyDown);
    syncOverlayState();

    return () => {
      observer.disconnect();
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return null;
}
