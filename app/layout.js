import Link from "next/link";
import "./globals.css";
import "./reading.css";
import "./follow-up.css";
import "./brand.css";
import "./mobile-selection.css";
import "./account.css";
import "./astrology.css";
import "./dream.css";

export const metadata = {
  title: "Vela",
  description: "Source-grounded tarot, structured sun-sign astrology, and reflective dream interpretation with Vela.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-Hant">
      <body>
        <div className="brandBar">
          <Link className="brandMark" href="/" aria-label="Vela 首頁">
            <span className="brandMarkIcon" aria-hidden="true">☾</span>
            <span>VELA</span>
          </Link>
        </div>
        {children}
      </body>
    </html>
  );
}
