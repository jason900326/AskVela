# AskVela Phase 7 — Astrology Specification

> Status: implementation complete; deployment acceptance requires migration `005_astrology_history.sql` and deployed smoke tests.

## Product scope

Phase 7 adds a deliberately small astrology experience beside Tarot:

```text
選擇太陽星座（或用生日協助選擇）
→ 選擇今日 / 本週
→ 由程式計算同一日期下的近似太陽、月亮、月相與主要相位訊號
→ Vela 只根據這些結構化訊號產生繁體中文反思
→ 登入使用者可保存並跨裝置重開
```

This is **not** a natal-chart engine. V1 Astrology does not collect birth time or birthplace and does not calculate houses, ascendant, full planetary ephemerides, synastry, or a complete birth chart.

## Why this architecture

A generic language model should not be asked to invent “today's planetary positions.” Phase 7 therefore separates deterministic calculation from language interpretation:

1. `lib/zodiac.js` owns the 12-sign tropical registry and birthday-to-sun-sign helper.
2. `lib/astrology-sky.js` computes approximate Sun/Moon ecliptic longitude at a documented reference time, Moon phase, sign placement, and a small major-aspect set relative to the selected sun sign.
3. `lib/astrology-reading.js` validates the request and gives the structured sky context to OpenAI.
4. `lib/astrology-prompts.js` explicitly forbids inventing other planets, houses, natal-chart placements, or unsupported aspects.

The result is reproducible for the same sign/date/period while still allowing Vela to write a useful, natural explanation.

## Astrology model

### Zodiac

- System: tropical zodiac
- Signs: 12
- Birthday helper uses conventional fixed date boundaries.
- Boundary/cusp dates are intentionally approximate because V1 does not collect birth time. Users who already know their sun sign can manually override the birthday helper.
- Birthday remains in browser state and is not sent to or stored by the server. Only the selected sun sign is sent.

### Sky context

V1 computes only:

- approximate Sun ecliptic longitude
- approximate Moon ecliptic longitude
- Sun sign
- Moon sign
- Moon phase
- major aspects (0°, 60°, 90°, 120°, 180°) between the Sun/Moon and the center of the selected sun sign within documented orbs

Reference time is 12:00 UTC for each selected calendar date. This is suitable for a lightweight reflective sun-sign feature, not precision electional astrology or a natal chart.

### Daily

One sky snapshot for the selected local calendar date.

### Weekly

Monday through Sunday containing the selected local calendar date, with seven snapshots and a compact Moon-sign / Moon-phase / aspect summary.

## AI contract

Vela may:

- translate the structured sky context into approachable Traditional Chinese
- connect the signals to general themes such as relationships, work/study, pace, attention, and reflection
- provide three small practical suggestions

Vela must not:

- invent Mercury/Venus/Mars/Jupiter/Saturn/etc. positions that are not in the input
- invent houses, ascendant, natal aspects, retrogrades, or a full birth chart
- state that an event will definitely happen
- turn a sun-sign description into a fixed judgment of the user's personality
- replace medical, legal, financial, or other professional judgment

## Output contract

The structured result contains:

- `overview`
- `overall`
- `relationships`
- `workStudy`
- `energy`
- `practicalGuidance` (exactly 3 items)
- `reflectionQuestion`
- `basisNote`

The API also returns the selected sign, period, local date, timezone label, structured sky context, deterministic reading ID, and disclaimer.

## Privacy and history

- Birthday is not saved.
- Only selected sign/date/period, generated interpretation, and the server-recomputed sky context can be saved.
- Saved astrology records use a separate `astrology_readings` table.
- RLS uses `auth.uid() = user_id` for select/insert/update/delete.
- Records expire 365 days after the latest save.
- Tarot and Astrology are shown together in the account's **我的紀錄** panel but are never silently injected into a new model request.

## Deployment acceptance

Before marking Phase 7 fully closed on production:

1. Apply `supabase/migrations/005_astrology_history.sql` to the active Supabase project.
2. Verify a daily reading and a weekly reading on the deployed site.
3. Verify a signed-in astrology reading shows `已保存`, survives reload/sign-out/sign-in, and can be reopened.
4. Verify Tarot history still opens correctly after the unified history change.
5. Smoke-test all 12 sign buttons and representative birthday boundaries on mobile and desktop.
6. Confirm CI lint, tests, and build are green.
