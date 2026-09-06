import "./globals.css";

export const metadata = {
  title: "AskVela",
  description: "Tarot knowledge assistant powered by a source-grounded RAG pipeline.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
