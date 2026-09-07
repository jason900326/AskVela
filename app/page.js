import TarotReadingFlow from "../components/TarotReadingFlow";

export default function HomePage() {
  return (
    <main className="shell readingShell">
      <TarotReadingFlow />

      <section className="trustGrid" aria-label="AskVela 解讀原則">
        <article className="infoCard">
          <span>01</span>
          <h2>先抽牌，再查來源</h2>
          <p>牌面一旦固定，後續重試解讀也沿用同一組牌，不會因 API 錯誤重新抽牌。</p>
        </article>
        <article className="infoCard">
          <span>02</span>
          <h2>原典與情境分開</h2>
          <p>先整理 Waite、Mathers 等來源中的牌義，再把牌義放回你的問題與牌陣位置中解讀。</p>
        </article>
        <article className="infoCard">
          <span>03</span>
          <h2>保留不確定性</h2>
          <p>AskVela 提供象徵性反思與可能方向，不把牌面當成對未來或他人的確定判決。</p>
        </article>
      </section>
    </main>
  );
}
