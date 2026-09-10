import PendingAuthResume from "../components/PendingAuthResume.js";
import VelaBrandLink from "../components/VelaBrandLink.js";
import VelaHistoryNavigationGuard from "../components/VelaHistoryNavigationGuard.js";
import VelaPageStackMotion from "../components/VelaPageStackMotion.js";
import "./globals.css";
import "./reading.css";
import "./follow-up.css";
import "./brand.css";
import "./mobile-selection.css";
import "./account.css";
import "./astrology.css";
import "./dream.css";
import "./speech-layer.css";
import "./phase8-polish.css";
import "./phase9-ui.css";
import "./phase9-accessibility.css";
import "./vela-home-art.css";
import "./phase10-art-ui.css";
import "./phase10-conversation-ui.css";
import "./phase10-tarot-immersion.css";
import "./phase10-tarot-flow-v2.css";
import "./phase10-tarot-dialogue.css";
import "./phase10-home-journey.css";
import "./phase10-cross-mode-polish.css";
import "./phase10-tarot-result-v3.css";
import "./phase10-final-ux.css";
import "./phase10-final-fixes.css";
import "./phase10-auth-waiting.css";
import "./phase10-retention-v1.css";
import "./phase10-history-exit.css";
import "./phase12a-monetization-ui.css";
import "./phase12a-flip-pages.css";
import "./phase12a-immersive-tarot.css";
import "./phase12a-free-flow-fixes.css";
import "./phase12a-mobile-stability.css";
import "./phase12a-deep-reading.css";
import "./phase12a-deck-motion.css";
import "./phase12a-vela-plus-home.css";

export const metadata = {
  title: "Vela",
  description: "Source-grounded tarot, astrology, and dream interpretation with Vela.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-Hant">
      <body>
        <div className="brandBar">
          <VelaBrandLink />
        </div>
        {children}
        <VelaPageStackMotion />
        <PendingAuthResume />
        <VelaHistoryNavigationGuard />
      </body>
    </html>
  );
}
