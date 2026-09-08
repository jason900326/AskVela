# AskVela Phase 7 — Astrology Specification

> Status: **source-grounded implementation complete; deployment acceptance remains.** Runtime generation now uses attributable Sepharial + Alan Leo source principles, actual computed Sun/Moon sky context, visible source references, and explicit natal/transit boundaries.

See [ASTROLOGY_SOURCES.md](ASTROLOGY_SOURCES.md) for edition provenance and source-content policy.

## Product principle

A deterministic sky calculation alone is not enough, and a book excerpt alone is not an interpretation. Formal AskVela Astrology results combine three separately labelled layers:

1. **Selected Sun sign** — a broad baseline only; V1 does not know the user's exact natal Sun degree.
2. **Current sky context** — approximate current Sun/Moon longitudes, Moon phase, and actual current Sun–Moon angular relationship.
3. **Source evidence** — scoped, attributable principles from legally usable historical astrology references.

Vela then performs a fourth step: **contextual synthesis**. It must explain the relationship between those layers rather than paraphrasing a paragraph from a book.

## Intended user flow

```text
進入 AskVela
→ 先跟中央的 Vela 說目前在意什麼
→ Vela 建議塔羅 / 星座 / 解夢
→ 使用者確認星座
→ 選擇太陽星座（或用生日協助選擇）
→ 選擇今日 / 本週
→ 程式計算當前 Sun/Moon context
→ deterministic evidence selector 取得符合 scope 的書籍原則
→ Vela 做「書中原則 → 當天天象 → 情境化延伸」
→ 顯示解讀 + 實際天象 + 人類可讀來源
→ 登入者可保存並跨裝置重開
```

This is **not** a natal-chart engine. V1 does not collect birth time/place and does not calculate houses, ascendant, a complete ephemeris, synastry, or a full natal chart.

## Source set

### Sepharial

- *Astrology: How to Make and Read Your Own Horoscope*
- Revised and Enlarged Edition, 1920
- Project Gutenberg #46963
- Used especially for zodiac structure, aspects, transit method, and synthesis method.

### Alan Leo

- *Astrology for All*
- Runtime rights/source edition: 4th edition, enlarged, 1910
- Casa Fernando Pessoa source is marked Public Domain Mark 1.0.
- Used especially for the twelve Sun-sign baselines, Sun/Moon principles, zodiac classification, and historical aspect doctrine.
- The user's uploaded 1931 sixth edition was cross-checked but is not the public-repository rights source.

## Evidence architecture

Runtime evidence is not a model-generated citation and does not rely on asking the model to remember a book.

`lib/astrology-source-corpus.js` contains concise attributable paraphrases with explicit scopes such as:

- `natal_sun_sign`
- `planet_principle`
- `zodiac_structure`
- `transit_method`
- `aspect_principle`
- `interpretation_method`
- `application_boundary`

`lib/astrology-evidence.js` selects the required evidence deterministically and creates the human-readable references returned with the reading.

If required evidence is absent, `createAstrologyReading()` throws `AstrologySourceError` and the API returns `503` rather than inventing a reading.

## Corrected sky model

The first Phase 7 prototype incorrectly compared the current Sun/Moon longitude to the **center of the selected Sun sign** and described that as an aspect. That created false precision because a sign midpoint is not the user's natal Sun degree.

The corrected model computes only:

- approximate current Sun ecliptic longitude;
- approximate current Moon ecliptic longitude;
- current Sun sign;
- current Moon sign;
- Moon phase;
- supported **current Sun–Moon** aspects: 0°, 60°, 90°, 120°, 180° within the configured orb.

No personal natal aspect is claimed without a real natal degree.

Reference time is 12:00 UTC for each selected calendar date. This remains a lightweight reflective calculation, not a precision electional or natal-chart service.

### Daily

One current sky snapshot for the chosen local calendar date.

### Weekly

Monday through Sunday containing the chosen date, with seven snapshots, Moon-sign sequence, phase progression, and any supported current Sun–Moon aspect highlights.

## Natal vs transit boundary

Alan Leo's Moon-in-sign and Sun–Moon combination chapters are primarily natal doctrine. AskVela may use them to understand the author's historical framework, but it must **not** transform a current transiting Moon into a natal-Moon personality claim.

Likewise:

- selected Sun sign = broad baseline;
- current Moon sign = current sky context;
- current Sun–Moon aspect = relationship between the two currently computed bodies;
- none of these is an Ascendant, house placement, exact natal Sun aspect, or complete birth chart.

## AI contract

Vela may:

- express sourced Sun-sign themes in modern Traditional Chinese;
- connect actual current Sun/Moon signals to general pace, attention, relationships, work/study and reflection;
- synthesize multiple supported signals rather than listing them mechanically;
- provide three small practical suggestions.

Vela must not:

- copy or lightly reword book paragraphs as the result;
- use a natal Moon passage as direct evidence for today's transiting Moon;
- invent Mercury/Venus/Mars/Jupiter/Saturn or outer-planet positions;
- invent retrogrades, houses, ascendant, natal aspects, or a full birth chart;
- invent source claims, pages, quotations, or author consensus;
- present historical medical, death, moral, physiognomic, gender, racial/national/class claims as modern facts;
- state that an event will definitely happen;
- turn Sun-sign material into a fixed personality judgment;
- replace medical, legal, financial, safety, or other professional judgment.

Historical `benefic/malefic` or `good/evil` aspect language is translated into non-deterministic interaction language such as more harmonious, more fluid, more tense, or requiring adjustment.

## Output and attribution

The structured result contains:

- `overview`
- `overall`
- `relationships`
- `workStudy`
- `energy`
- `practicalGuidance` (3 items)
- `reflectionQuestion`
- `basisNote`

The API also returns:

- selected sign, period, local date, timezone;
- server-generated `skyContext`;
- deterministic `readingId`;
- `sourceGrounded: true`;
- `sources.references` with author/title/edition/source location;
- disclaimer.

The result UI exposes both **actual sky signals** and **reference sources** under “這次解讀是怎麼來的？”.

## Privacy and history

- Birthday stays client-side and is not saved.
- History stores the selected sign/date/period, interpretation, and sky context.
- On save/restore, server code recomputes source evidence from canonical code rather than trusting client-provided source references.
- Records use `astrology_readings`, RLS ownership, and 365-day retention.
- Tarot and Astrology can share **我的紀錄**, but saved readings are not silently injected into new model requests.

## Remaining Phase 7 deployment acceptance

Source design and source-fidelity implementation are complete. Phase 7 closes after:

1. apply `supabase/migrations/005_astrology_history.sql` to the active Supabase project;
2. CI lint/tests/build pass for the source-grounding PR;
3. deploy and smoke-test at least one daily and one weekly reading on mobile and desktop;
4. verify visible source references and correct Sun/Moon wording;
5. verify signed-in Astrology history survives reload/sign-out/sign-in and can be reopened;
6. verify Tarot history remains unaffected.
