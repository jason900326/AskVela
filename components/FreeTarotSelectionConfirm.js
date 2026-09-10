"use client";

import { useEffect, useRef, useState } from "react";

const CARD_SELECTOR = ".immersiveQuickTarot.stage-select .immersiveCardBack";

export default function FreeTarotSelectionConfirm() {
  const [pending, setPending] = useState(null);
  const targetRef = useRef(null);
  const bypassRef = useRef(null);

  useEffect(() => {
    function clearPending() {
      targetRef.current?.classList.remove("isPendingConfirm");
      targetRef.current = null;
      bypassRef.current = null;
      setPending(null);
    }

    function handleCardClick(event) {
      const origin = event.target instanceof Element ? event.target : null;
      const card = origin?.closest(CARD_SELECTOR);
      if (!card || card.disabled) return;

      if (bypassRef.current === card) {
        bypassRef.current = null;
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();

      if (targetRef.current && targetRef.current !== card) {
        targetRef.current.classList.remove("isPendingConfirm");
      }

      targetRef.current = card;
      card.classList.add("isPendingConfirm");
      setPending({ label: card.getAttribute("aria-label") || "這張牌" });
    }

    document.addEventListener("click", handleCardClick, true);
    window.addEventListener("popstate", clearPending);
    window.addEventListener("vela:experience", clearPending);

    return () => {
      document.removeEventListener("click", handleCardClick, true);
      window.removeEventListener("popstate", clearPending);
      window.removeEventListener("vela:experience", clearPending);
      targetRef.current?.classList.remove("isPendingConfirm");
    };
  }, []);

  function cancelSelection() {
    targetRef.current?.classList.remove("isPendingConfirm");
    targetRef.current = null;
    setPending(null);
  }

  function confirmSelection() {
    const card = targetRef.current;
    if (!card || !card.isConnected) {
      cancelSelection();
      return;
    }

    bypassRef.current = card;
    card.classList.remove("isPendingConfirm");
    targetRef.current = null;
    setPending(null);

    window.requestAnimationFrame(() => card.click());
  }

  if (!pending) return null;

  return (
    <div className="freeTarotConfirmLayer" role="dialog" aria-modal="true" aria-labelledby="free-tarot-confirm-title">
      <div className="freeTarotConfirmCard">
        <span className="freeTarotConfirmEyebrow">CARD SELECTED</span>
        <h2 id="free-tarot-confirm-title">確定選這張嗎？</h2>
        <p>{pending.label}。現在還沒有翻開；如果剛剛是誤觸，可以換一張。</p>
        <div className="freeTarotConfirmActions">
          <button type="button" className="ghostButton" onClick={cancelSelection}>換一張</button>
          <button type="button" className="primaryButton" onClick={confirmSelection}>就是這張</button>
        </div>
      </div>
    </div>
  );
}
