# AskVela V1 Product Specification

> Status: Frozen for V1  
> Last updated: 2026-09-07

## 1. Product definition

AskVela V1 is:

> 一個有可靠書籍依據、能進行 AI 塔羅占卜的網站。

V1 的核心價值不是「AI 隨機說一段像塔羅的話」，而是：

1. 使用者完成一次真正的抽牌流程。
2. 每張牌的基礎牌義與象徵可追溯至書籍來源。
3. AI 清楚區分「原書內容」與「結合使用者問題的解讀」。
4. 結果使用繁體中文，並保留必要的英文牌名與術語。
5. 使用者可以針對同一次占卜繼續追問。

## 2. Target user and primary job

### Target user

想透過塔羅整理感受、關係、工作或近期方向，且在意解讀是否有來源依據的人。

### Primary job

當使用者對一個問題感到困惑時，AskVela 協助他們：

- 把問題說清楚。
- 選擇合適且不複雜的牌陣。
- 完成隨機抽牌。
- 理解每張牌在該位置與正逆位下的意義。
- 看懂牌與牌之間形成的整體脈絡。
- 以追問繼續釐清，而不是把結果當成確定的未來。

## 3. Canonical V1 flow

```text
進入網站
→ 選擇塔羅占卜
→ 輸入問題
→ 選擇牌陣
→ 洗牌／抽牌
→ 翻開並顯示牌面
→ 從書籍知識庫檢索相關內容
→ AI 產生完整占卜結果
→ 使用者可針對本次結果追問
```

### Flow states

| State | User sees | Required outcome |
| --- | --- | --- |
| Landing | AskVela 與塔羅入口 | 能開始一次新占卜 |
| Question | 問題輸入欄與提示 | 取得有效、非空白問題 |
| Spread | V1 可用牌陣 | 選定牌陣與每個位置 |
| Draw | 牌背與抽牌操作 | 由伺服器產生不重複牌與正逆位 |
| Reveal | 牌名、位置、正逆位 | 使用者確認本次抽牌結果 |
| Reading | 完整解讀與來源 | 顯示單牌解讀、整體綜合與反思建議 |
| Follow-up | 追問輸入欄 | 追問保留原問題、牌陣、抽牌與來源上下文 |
| Error | 可理解的錯誤訊息 | 可重試，且不默默重抽不同的牌 |

## 4. V1 spread scope

V1 只提供兩類牌陣：

### Single card

適合快速指引與聚焦問題。

- Position: `guidance`（指引）

### Three cards

V1 提供兩種位置組合：

- `past / present / future`（過去／現在／未來）
- `situation / obstacle / advice`（現況／阻礙／建議）

Celtic Cross 不屬於第一個可上線版本；等單張牌與三張牌的來源品質、解讀格式與追問流程穩定後再加入。

## 5. Functional requirements

### 5.1 Question

- 必填。
- 前後空白需移除。
- 最長 500 個字元。
- 提供例句，但不可預填成使用者的問題。
- 對醫療、法律、財務等高風險問題，結果需提醒使用者尋求合格專業人士協助。
- 不把死亡、懷孕、疾病、犯罪或投資結果描述成確定事實。

### 5.2 Card draw

- 使用完整 78 張 Rider–Waite–Smith 牌組。
- 同一次占卜不得抽到重複牌。
- 每張牌獨立決定正位或逆位。
- 抽牌結果由伺服器產生，不由語言模型挑牌。
- 一旦產生本次抽牌結果，API 重試不得改變牌組；需使用 reading/draw id 保持冪等。
- 初期可使用簡單翻牌效果，不阻塞知識與解讀功能。

### 5.3 Knowledge retrieval

每一張抽出的牌至少帶有：

- `card_id`
- `name_en`
- `name_zh_tw`
- `arcana`
- `number_or_rank`
- `suit`（Minor Arcana）
- `orientation`
- `spread_position`
- `source_book`
- `source_location`
- 原書牌面描述／象徵
- 原書占卜牌義
- 逆位牌義（若來源有記載）

檢索時必須先以牌的結構化欄位縮小範圍，再以語意搜尋補充上下文。不同作者的觀點不得混成單一來源說法。

### 5.4 Interpretation output

完整結果至少包含：

1. 問題與牌陣摘要。
2. 抽到的牌、位置與正逆位。
3. 每張牌的「原書依據」。
4. 每張牌結合問題與位置的「情境解讀」。
5. 多張牌之間的整體脈絡（單張牌可省略）。
6. 可實際思考或採取的方向。
7. 使用到的書名、作者與可用的章節／位置資訊。
8. 非決定論聲明：塔羅作為象徵性反思，不保證未來事件。

Vela 的語氣應冷靜、清楚、有同理心，不恐嚇、不故弄玄虛，也不把原書沒有說的話偽裝成引文。

### 5.5 Follow-up

- 追問必須保留同一次 reading 的問題、牌陣、牌、正逆位、先前回答與來源。
- 追問不重新抽牌，除非使用者明確開始新占卜。
- V1 可先保留於瀏覽器 session；帳號與跨裝置歷史屬於後續 Phase。
- 需限制單次訊息長度與同一 reading 的追問次數，以控制成本與濫用。

## 6. Minimum data contract

### Create a draw

```json
{
  "question": "我最近是否適合換工作？",
  "spreadId": "situation-obstacle-advice"
}
```

```json
{
  "readingId": "uuid",
  "spread": {
    "id": "situation-obstacle-advice",
    "positions": ["situation", "obstacle", "advice"]
  },
  "cards": [
    {
      "cardId": "major-09-hermit",
      "nameEn": "The Hermit",
      "nameZhTw": "隱者",
      "position": "situation",
      "orientation": "upright"
    }
  ]
}
```

### Generate a reading

```json
{
  "readingId": "uuid",
  "requestId": "the-same-idempotency-key-used-for-the-draw",
  "question": "我最近是否適合換工作？",
  "spreadId": "situation-obstacle-advice"
}
```

The client may send the request ID through the `Idempotency-Key` header instead
of the JSON body. The interpretation endpoint regenerates the draw from this
server-verifiable input and checks `readingId`; it does not trust client-supplied
cards, positions, or orientations.

### Follow up

```json
{
  "readingId": "uuid",
  "message": "那我現在最需要先確認的是什麼？"
}
```

The API may evolve, but these concepts and boundaries are part of the frozen V1 scope.

## 7. Source-grounding rules

- 原書內容是牌義、象徵與作者觀點的主要依據。
- AI 可以做情境推理，但必須標示為解讀或綜合，不得假裝是作者原話。
- 沒有足夠來源時，直接說明資料不足。
- 不捏造頁碼、章節、引文或作者共識。
- 回答以繁體中文為主；首次出現牌名時顯示中文與英文。
- 來源資訊應讓使用者看得懂，不只顯示內部 chunk id。

## 8. Explicitly out of scope

V1 不做：

- 星座
- 解夢
- 好友系統
- 社群功能
- AI 語音
- 複雜洗牌或 3D 動畫
- 大量角色換裝
- 原生 App
- 多層級付費方案
- 完整個人帳號與跨裝置歷史
- Celtic Cross 與大量自訂牌陣
- AI 自行決定抽到哪張牌

以上需求統一放入 V2/V3 backlog，不得插入 V1 主線。

## 9. V1 acceptance criteria

只有全部符合，才可稱為 AskVela V1：

- [ ] 使用者能從首頁完成「問題 → 牌陣 → 抽牌 → 翻牌 → 解讀」。
- [ ] 單張與兩種三張牌陣可用。
- [ ] 使用完整 78 張牌，抽牌不重複，正逆位可用。
- [ ] 每張牌可透過結構化資料命中正確的書籍區段。
- [ ] 完整結果區分來源牌義、情境解讀與整體綜合。
- [ ] 結果顯示可理解的來源資訊。
- [ ] 來源不足時不亂補。
- [ ] 使用者可以在同一次 reading 追問，且不會意外重抽。
- [ ] 手機與桌機都能完成核心流程。
- [ ] API 有輸入驗證、錯誤處理、基本 rate limiting 與成本保護。
- [ ] 通過 lint、build 與核心流程測試。
- [ ] 有隱私權、使用條款、AI／塔羅免責說明後才公開上線。

## 10. Product decisions reserved for later

以下尚未凍結，不應阻塞 Phase 1–3：

- Vela 最終角色視覺。
- 首頁完整美術與水晶球動畫。
- 最終牌背與牌面素材。
- 付費價格與額度。
- 是否加入匿名歷史紀錄。
- V2 的第二本書與多來源比較方式。
