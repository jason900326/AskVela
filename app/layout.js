import Link from "next/link";
import "./globals.css";
import "./reading.css";
import "./follow-up.css";
import "./brand.css";
import "./mobile-selection.css";
import "./account.css";
import "./astrology.css";

export const metadata = {
  title: "Vela",
  description: "Source-grounded tarot readings and structured sun-sign astrology with Vela.",
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
