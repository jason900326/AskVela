"use client";

import { useEffect } from "react";

const PENDING_AUTH_KEY = "askvela.pending-auth-experience.v1";

export default function PendingAuthResume() {
  useEffect(() => {
    const pending = window.sessionStorage.getItem(PENDING_AUTH_KEY);
    if (!pending || !["dream", "tarot", "astrology"].includes(pending)) return undefined;

    window.sessionStorage.removeItem(PENDING_AUTH_KEY);
    const timer = window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent("vela:experience", { detail: pending }));
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  return null;
}
