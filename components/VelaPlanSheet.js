"use client";

export default function VelaPlanSheet({ open, onClose, onStartDeep }) {
  if (!open) return null;

  return (
    <div className="velaPlanOverlay" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose?.();
    }}>
      <section className="velaPlanSheet" role="dialog" aria-modal="true" aria-labelledby="vela-plan-title">
        <button className="velaPlanClose" type="button" onClick={onClose} aria-label="關閉方案比較">×</button>
        <div className="velaPlanEyebrow">ASK VELA</div>
        <h2 id="vela-plan-title">你想怎麼問 Vela？</h2>
        <p className="velaPlanLead">Free 適合從預設的小問題體驗 Vela；Vela+ 才能把自己的事情直接說給她聽。</p>

        <div className="velaPlanGrid">
          <article className="velaPlanCard isFree">
            <div className="velaPlanCardHead">
              <span>FREE</span>
              <strong>先玩一張牌</strong>
            </div>
            <p>完整回答，不把免費版做成比較笨的 Vela；差別在你能不能自由提出自己的問題。</p>
            <ul>
              <li>從 Vela 準備的預設問題中選擇</li>
              <li>登入後每天 3 次 Free 體驗</li>
              <li>每題自己抽 1 張牌</li>
              <li>完整、grounded 的單張解讀</li>
              <li>保存與分享結果</li>
            </ul>
            <button className="ghostButton" type="button" onClick={onClose}>繼續免費使用</button>
          </article>

          <article className="velaPlanCard isPlus">
            <div className="velaPlanCardHead">
              <span>VELA+</span>
              <strong>把自己的事看深</strong>
            </div>
            <p>自由描述真正困擾你的事情；Vela 會先理解問題，再主持整個閱讀 Session。</p>
            <ul>
              <li>自由輸入自己的問題，不受預設題目限制</li>
              <li>Vela 先幫你釐清真正卡住的地方</li>
              <li>依問題決定閱讀結構，不用自己選牌陣</li>
              <li>可以回答 Vela、追問同一件事</li>
              <li>必要時補牌，保留事情的前後脈絡</li>
              <li>完整個人占星能力將納入 Vela+</li>
            </ul>
            <button className="primaryButton" type="button" onClick={onStartDeep}>看看 Deep Reading</button>
            <small>目前為 Phase 12A 體驗原型；尚未啟用收費。</small>
          </article>
        </div>

        <p className="velaPlanPolicy">AskVela 不使用點數、錢包、儲值或充值制度。</p>
      </section>
    </div>
  );
}
