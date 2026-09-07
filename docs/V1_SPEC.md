# AskVela Launch Product Specification

> Status: Revised scope  
> Last updated: 2026-09-07

## 1. Product definition

AskVela's first public product is a guided Vela experience with three private reflective tools:

1. **Tarot** — source-grounded card readings with fixed draws and follow-up questions.
2. **Astrology** — daily/weekly sun-sign reflection driven by deterministic structured sky signals rather than invented model data.
3. **Dream interpretation** — a later phase before public launch, with explicit source/context separation.

The shared product principle is:

> Vela may interpret structured evidence, but must not disguise model invention as a source, calculation, or certainty about the future.

## 2. Shared product rules

- Traditional Chinese is the primary user language.
- Login is optional for use; signing in adds private cross-device history.
- Saved history is user-controlled, RLS-isolated, and retained for 365 days after its latest save.
- Old history is never silently injected into a new model request.
- High-stakes medical, legal, financial, safety, pregnancy, disease, crime, or investment questions must not receive deterministic predictions or professional instructions.
- Vela's tone is clear, calm, conversational, and non-judgmental.

## 3. Tarot contract

The existing Tarot V1 contract remains unchanged:

```text
問題
→ 牌陣
→ 使用者選牌
→ 固定伺服器抽牌結果
→ 翻牌
→ Waite / Mathers 結構化來源檢索
→ Layer A 原典牌義
→ Layer B 情境 / 位置解讀
→ Layer C 綜合
→ 同一組牌可追問
```

- Complete 78-card Rider–Waite–Smith registry.
- Single-card, past/present/future, and situation/obstacle/advice spreads.
- No duplicate cards within one draw.
- Upright/reversed orientation is independent.
- Retry never silently changes a fixed draw.
- Different authors remain separately attributable.
- Curated historical wording cannot become a direct character attack on the user or a third party.

## 4. Astrology V1 contract

Astrology V1 is intentionally smaller than a full astrology platform:

```text
選太陽星座（可用生日協助）
→ 今日 / 本週
→ deterministic Sun/Moon sky context
→ Vela structured interpretation
→ optional private history
```

Detailed method: [ASTROLOGY_SPEC.md](ASTROLOGY_SPEC.md).

### Included

- 12 tropical sun signs
- conventional birthday-to-sign helper plus manual override
- daily and weekly periods
- approximate Sun longitude
- approximate Moon longitude
- Moon sign and Moon phase
- a small major-aspect set relative to the selected sun-sign center
- structured Traditional Chinese interpretation
- private cross-device history

### Explicitly not included in Astrology V1

- birth time or birthplace collection
- ascendant
- houses
- a full planetary ephemeris
- natal chart
- synastry
- electional astrology
- deterministic event prediction

Boundary/cusp dates are approximate because V1 does not collect birth time; users may manually choose a known sun sign.

## 5. Dream interpretation launch contract

Phase 8 must establish this before Dream can be called complete:

- user dream description
- extracted entities/themes/emotions
- source-backed dream symbolism / psychology material
- clear separation between source material and Vela's contextual synthesis
- no diagnosis, recovered-memory claims, paranormal certainty, or prediction presented as fact
- optional private history

## 6. Account contract

- Anonymous Tarot and Astrology remain usable.
- Email/password, password recovery, and Google OAuth are supported.
- An active anonymous result may be saved after sign-in without changing the underlying Tarot draw or Astrology calculation.
- Private history may be reopened or deleted by its owner.
- Tarot and Astrology share one **我的紀錄** presentation while using modality-specific validated storage.

## 7. Final visual scope

The functional UX may use placeholders until Phases 9–10. Before public launch AskVela still requires:

- coherent landing navigation for Tarot / Astrology / Dream
- final Vela character art and mode-specific visual treatment
- final backgrounds, Tarot assets, zodiac/dream assets, favicon/logo/OG image
- responsive loading, empty, error, auth, and history states

Do not repeatedly redesign layout around unfinished art; lock component dimensions first, then replace placeholders.

## 8. Explicitly out of first public launch

- full natal chart and astrology compatibility tools
- social feed / friends / public profiles
- public reading history
- native app
- AI voice
- large 3D/complex animation system
- large outfit collection
- Celtic Cross and large custom-spread catalogue
- broad multi-tier payment system before entitlements are validated

## 9. Launch acceptance

AskVela is ready for public launch only when:

- Tarot core, same-reading follow-up, and private history remain green.
- Astrology daily/weekly plus private history pass production smoke tests.
- Dream interpretation meets its source/safety contract.
- All three modes share final navigation, account behavior, voice, and responsive UI.
- Production has rate limiting, cost controls, privacy-conscious logging, security review, Privacy Policy, Terms, and divination/AI disclaimers.
- CI lint, tests, source validation, and build are green.
- A small closed beta is completed.
