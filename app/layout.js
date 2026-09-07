import "./globals.css";
import "./reading.css";

export const metadata = {
  title: "AskVela",
  description: "Source-grounded tarot readings with a guided, anonymous V1 experience.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
