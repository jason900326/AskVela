import "./globals.css";
import "./reading.css";
import "./follow-up.css";
import "./brand.css";
import "./mobile-selection.css";

export const metadata = {
  title: "Vela",
  description: "Source-grounded tarot readings with a guided, anonymous V1 experience.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-Hant">
      <body>
        <div className="brandBar">
          <a className="brandMark" href="/" aria-label="Vela 首頁">
            <span className="brandMarkIcon" aria-hidden="true">☾</span>
            <span>VELA</span>
          </a>
        </div>
        {children}
      </body>
    </html>
  );
}
