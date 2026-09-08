"use client";

import Link from "next/link";

export default function VelaBrandLink() {
  function returnHome() {
    window.dispatchEvent(new CustomEvent("vela:experience", { detail: "home" }));
  }

  return (
    <Link className="brandMark" href="/" aria-label="Vela 首頁" onClick={returnHome}>
      <span className="brandMarkIcon" aria-hidden="true">☾</span>
      <span>VELA</span>
    </Link>
  );
}
