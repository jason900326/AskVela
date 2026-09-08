import PendingAuthResume from "../components/PendingAuthResume.js";
import VelaBrandLink from "../components/VelaBrandLink.js";
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
        <PendingAuthResume />
      </body>
    </html>
  );
}
