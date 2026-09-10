"use client";

export default function VelaPlanSheet({ open, isVelaPlus = false, onClose, onStartDeep }) {
  if (!open) return null;

  return (
    <div className="velaPlanOverlay" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose?.();
    }}>
      <section className="velaPlanSheet" role="dialog" aria-modal="true" aria-labelledby="vela-plan-title">
        <button className="velaPlanClose" type="button" onClick={onClose} aria-label="關閉方案比較">×</button>
        <div className="velaPlanEyebrow">ASK VELA</div>
        <h2 id="vela-plan-title">想看到多深，由你決定。</h2>
        <p className="velaPlanLead">所有人都可以先自由提問、讓 Vela 聽懂，再免費完整看一張牌。需要更深入時，價格會在開始前說清楚。</p>

        <div className="velaPlanGrid velaPlanGridThree">
          <article className="velaPlanCard isFree">
            <div className="velaPlanCardHead">
              <span>FREE</span>
              <strong>先看最重要的一張</strong>
            </div>
            <p>免費版也會理解你的問題，並給一個完整答案；不會把結果做到一半再鎖起來。</p>
            <ul>
              <li>自由描述自己的問題</li>
              <li>Vela 先做一次問題釐清</li>
              <li>自己抽 1 張牌</li>
              <li>一句結論、解釋與下一步</li>
              <li>不需先註冊才能看結果</li>
            </ul>
            <button className="ghostButton" type="button" onClick={onClose}>繼續免費使用</button>
          </article>

          <article className="velaPlanCard isDeep">
            <div className="velaPlanCardHead">
              <span>DEEP READING</span>
              <strong>NT$29 / 次</strong>
            </div>
            <p>這一筆只買這次完整 Reading，沒有點數、儲值或預付餘額。</p>
            <ul>
              <li>Vela 依你的事情設計 3 個閱讀位置</li>
              <li>3 張牌逐張揭示與解析</li>
              <li>最後給一個精簡的整體結論</li>
              <li>包含有限追問</li>
              <li>真的卡住時才補 1 張釐清牌</li>
            </ul>
            <button className="primaryButton" type="button" disabled>
              {isVelaPlus ? "已包含在 Vela+" : "即將開放"}
            </button>
          </article>

          <article className="velaPlanCard isPlus">
            <div className="velaPlanCardHead">
              <span>VELA+</span>
              <strong>{isVelaPlus ? "已啟用" : "月訂 · 價格待定"}</strong>
            </div>
            <p>適合不是只想看一次，而是希望同一件事之後有變化還能接著聊的人。</p>
            <ul>
              <li>包含完整 Deep Reading 能力</li>
              <li>同一議題可以持續追問</li>
              <li>隔幾天回來仍保留前後脈絡</li>
              <li>必要時再補牌，不用每次重抽</li>
              <li>正式月額與使用上限會依實際成本決定</li>
            </ul>
            {isVelaPlus ? (
              <button className="primaryButton" type="button" onClick={onStartDeep}>開始深度解析</button>
            ) : (
              <button className="ghostButton" type="button" disabled>訂閱即將開放</button>
            )}
          </article>
        </div>

        <p className="velaPlanPolicy">AskVela 不使用點數、錢包、儲值、充值或購買餘額；單次 Reading 直接購買該次服務。</p>
      </section>
    </div>
  );
}
