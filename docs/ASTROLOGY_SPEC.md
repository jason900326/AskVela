# AskVela Phase 7 — Astrology Specification

> Status: **source grounding reopened**. The calculation/UI prototype exists, but production astrology generation is intentionally paused until traceable book sources are ingested and cited.

## Product principle

AskVela should not present a polished AI horoscope as trustworthy merely because the astronomical inputs are deterministic. The product promise is stronger: interpretation should also have a traceable knowledge source.

Therefore Phase 7 now separates three things:

1. **Deterministic sky context** — approximate Sun/Moon positions, Moon phase, and a small supported aspect set.
2. **Astrology knowledge source** — books or other legally usable, attributable source material that has been ingested and can be retrieved.
3. **Vela interpretation** — contextual Traditional Chinese writing grounded in both the deterministic context and retrieved source material.

Until step 2 is complete, step 3 stays disabled in production.

## Intended user flow

The site no longer starts with three equal mode tabs. The canonical entry is Vela herself:

```text
進入 AskVela
→ 先跟中央的 Vela 說目前在意什麼
→ Vela 判斷比較適合塔羅 / 星座 / 解夢
→ 使用者確認後進入對應流程
```

For Astrology after Vela recommends it:

```text
選擇太陽星座（或用生日協助選擇）
→ 選擇今日 / 本週
→ 檢索可追溯的占星來源
→ 程式計算同一日期下的近似太陽、月亮、月相與支援的相位訊號
→ Vela 只根據來源 + 結構化天象產生繁體中文反思
→ 顯示可理解的來源資訊
→ 登入使用者可保存並跨裝置重開
```

This is **not** a natal-chart engine. Phase 7 does not collect birth time or birthplace and does not calculate houses, ascendant, full planetary ephemerides, synastry, or a complete birth chart.

## Current trust gate

`lib/astrology-source-status.js` is the explicit launch gate.

- `ASTROLOGY_SOURCE_READY = false` while there is no ingested astrology source set.
- The UI still allows the sign/period interaction to be previewed, but the generate button stays disabled.
- `/api/astrology/reading` also returns `503 ASTROLOGY_SOURCES_NOT_READY`, so the gate cannot be bypassed through a direct API call.
- Old prototype astrology outputs without `sourceGrounded: true` are no longer restored as formal readings.

This gate should only be removed after source ingestion, retrieval, attribution, and source-fidelity tests exist.

## Source-grounding requirements

Before astrology generation is re-enabled:

- At least one legally usable astrology source must be uploaded and documented.
- Source metadata must include title, author, edition/year where available, and source location/chapter information.
- Retrieval must distinguish source claims from Vela's contextual interpretation.
- The result UI must expose human-readable source references.
- If retrieval is insufficient, the system must refuse to invent an interpretation.
- Multiple authors must remain separately attributable rather than blended into false consensus.

## Astrology model

### Zodiac

- System: tropical zodiac
- Signs: 12
- Birthday helper uses conventional fixed date boundaries.
- Boundary/cusp dates are intentionally approximate because this phase does not collect birth time.
- Users who already know their sun sign can manually override the birthday helper.
- Birthday remains in browser state and is not sent to or stored by the server. Only the selected sun sign is sent.

### Sky context

The existing prototype computes only:

- approximate Sun ecliptic longitude
- approximate Moon ecliptic longitude
- Sun sign
- Moon sign
- Moon phase
- major aspects (0°, 60°, 90°, 120°, 180°) between the Sun/Moon and the center of the selected sun sign within documented orbs

Reference time is 12:00 UTC for each selected calendar date. This is suitable as lightweight context for reflective sun-sign content, not precision electional astrology or a natal chart.

### Daily

One sky snapshot for the selected local calendar date.

### Weekly

Monday through Sunday containing the selected local calendar date, with seven snapshots and a compact Moon-sign / Moon-phase / aspect summary.

## AI contract after source ingestion

Vela may:

- summarize retrieved astrology source material in Traditional Chinese
- translate the structured sky context into approachable language
- connect supported source themes to relationships, work/study, pace, attention, and reflection
- provide small practical suggestions

Vela must not:

- invent Mercury/Venus/Mars/Jupiter/Saturn/etc. positions that are not in the input
- invent houses, ascendant, natal aspects, retrogrades, or a full birth chart
- invent source claims, page numbers, quotations, or author consensus
- state that an event will definitely happen
- turn a sun-sign description into a fixed judgment of the user's personality
- replace medical, legal, financial, or other professional judgment

## Privacy and history

- Birthday is not saved.
- Once source-grounded generation is enabled, only selected sign/date/period, generated interpretation, source references, and server-recomputed sky context may be saved.
- Saved astrology records use a separate `astrology_readings` table.
- RLS uses `auth.uid() = user_id` for select/insert/update/delete.
- Records expire 365 days after the latest save.
- Tarot and Astrology are shown together in the account's **我的紀錄** panel but are never silently injected into a new model request.

## Revised Phase 7 exit criteria

Phase 7 cannot be closed until all of the following are true:

1. Choose and upload the astrology source set.
2. Add ingestion/retrieval and human-readable source attribution.
3. Add source-fidelity and insufficient-evidence tests.
4. Remove the source-readiness gate only after those tests pass.
5. Apply `supabase/migrations/005_astrology_history.sql` to the active Supabase project.
6. Verify daily + weekly source-grounded readings on mobile and desktop.
7. Verify signed-in astrology history survives reload/sign-out/sign-in and can be reopened.
8. Verify Tarot history remains unaffected.
9. Confirm CI lint, tests, and build are green.
