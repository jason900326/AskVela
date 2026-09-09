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
        <p className="velaPlanLead">免費版適合三個小問題；Vela+ 是把一件真正卡住你的事攤開來看。</p>

        <div className="velaPlanGrid">
          <article className="velaPlanCard isFree">
            <div className="velaPlanCardHead">
              <span>FREE</span>
              <strong>輕鬆問問</strong>
            </div>
            <p>完整回答，不把免費版做成比較笨的 Vela。</p>
            <ul>
              <li>登入後每天 3 個小問題</li>
              <li>每題自己抽 1 張牌</li>
              <li>完整、grounded 的單張解讀</li>
              <li>保存與分享結果</li>
            </ul>
            <button className="ghostButton" type="button" onClick={onClose}>繼續免費使用</button>
          </article>

          <article className="velaPlanCard isPlus">
            <div className="velaPlanCardHead">
              <span>VELA+</span>
              <strong>把一件事看深</strong>
            </div>
            <p>不是多抽幾張牌，而是讓 Vela 先理解問題，再主持整個閱讀 Session。</p>
            <ul>
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
