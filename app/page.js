import TarotAskForm from "../components/TarotAskForm";

export default function HomePage() {
  return (
    <main className="shell">
      <section className="hero">
        <div className="eyebrow">ASKVELA · TAROT KNOWLEDGE MVP</div>
        <h1>讓每一次解牌，都能回到真正的來源。</h1>
        <p className="heroCopy">
          先以 Rider–Waite–Smith 系統與《The Pictorial Key to the Tarot》建立第一層知識庫。
          問題會先檢索原書內容，再交給 AI 整理回答。
        </p>
      </section>

      <TarotAskForm />

      <section className="infoGrid" aria-label="目前系統能力">
        <article className="infoCard">
          <span>01</span>
          <h2>Source-grounded</h2>
          <p>回答前先找相關書籍片段，避免只靠模型既有印象解牌。</p>
        </article>
        <article className="infoCard">
          <span>02</span>
          <h2>Multi-book ready</h2>
          <p>資料結構已預留多書籍、不同作者與不同塔羅系統的 metadata。</p>
        </article>
        <article className="infoCard">
          <span>03</span>
          <h2>Traceable</h2>
          <p>API 會回傳命中的來源，之後可進一步顯示章節、頁碼與作者觀點。</p>
        </article>
      </section>
    </main>
  );
}
