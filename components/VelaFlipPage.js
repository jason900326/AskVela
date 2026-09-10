"use client";

import { useLayoutEffect, useRef } from "react";

export const VELA_FLIP_PAGE_READY_EVENT = "vela:flip-page-ready";

export default function VelaFlipPage({
  pageKey,
  step = null,
  total = null,
  label = "",
  className = "",
  children,
}) {
  const pageRef = useRef(null);
  const showProgress = Number.isInteger(step) && Number.isInteger(total) && total > 1;

  useLayoutEffect(() => {
    const node = pageRef.current;
    if (!node) return;

    window.dispatchEvent(new CustomEvent(VELA_FLIP_PAGE_READY_EVENT, {
      detail: { pageKey, node },
    }));
  }, [pageKey]);

  return (
    <div className="velaFlipDeck">
      <section
        ref={pageRef}
        key={pageKey}
        data-vela-page-key={pageKey}
        className={`velaFlipPage ${className}`.trim()}
      >
        {showProgress && (
          <div className="velaFlipProgress" aria-label={`第 ${step} 頁，共 ${total} 頁`}>
            <span className="velaFlipPageLabel">{label || `PAGE ${step}`}</span>
            <div className="velaFlipDots" aria-hidden="true">
              {Array.from({ length: total }, (_, index) => (
                <i key={index} className={index + 1 <= step ? "isActive" : ""} />
              ))}
            </div>
            <span className="velaFlipCount">{step}/{total}</span>
          </div>
        )}
        {children}
      </section>
    </div>
  );
}
