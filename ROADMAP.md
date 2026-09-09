# AskVela Roadmap

This file is the single development checklist for AskVela. Work follows the phase order below unless a production incident requires otherwise.

## Current status

- Current phase: **Phase 12A — Paid product design**
- Core launch experiences are implemented: Tarot + Astrology + Dream interpretation.
- Production history migrations `005_astrology_history.sql`, `006_dream_history.sql`, and `007_retention_conversations.sql` have been applied.
- Signed-in reading results are confirmed to persist into **我的紀錄** on production.
- Reading Quality v3, shared Vela Speech, share cards, cross-mode follow-ups, anonymous-reading handoff, and Retention v1 are implemented in code.
- Remaining visual/regression work in Phases 9–11 may continue in parallel, but no longer blocks entitlement design.
- Payments must not be wired directly into reading APIs; Phase 12 first defines product limits, entitlements, and server-side usage accounting.
- Launch scope: Tarot + Astrology + Dream interpretation, followed by monetization, production hardening, and closed beta.
- Product scope: [docs/V1_SPEC.md](docs/V1_SPEC.md)
- Astrology contract: [docs/ASTROLOGY_SPEC.md](docs/ASTROLOGY_SPEC.md)
- Astrology source provenance: [docs/ASTROLOGY_SOURCES.md](docs/ASTROLOGY_SOURCES.md)
- Dream contract: [docs/DREAM_SPEC.md](docs/DREAM_SPEC.md)
- Vela voice contract: [docs/VELA_VOICE.md](docs/VELA_VOICE.md)

## Phase 0 — Product foundation ✅
- [x] Define the product and canonical Tarot flow
- [x] Freeze source-grounding and safety rules
- [x] Establish repository conventions and public-domain source handling

## Phase 1 — Structured Tarot knowledge ✅
- [x] Canonical 78-card registry with Traditional Chinese names
- [x] Waite structured parser and metadata
- [x] Card/orientation-first retrieval before semantic ranking
- [x] Supabase/pgvector structured ingestion and validation

## Phase 2 — Tarot draw engine ✅
- [x] V1 spread registry
- [x] Deterministic server-side 78-card draw
- [x] No duplicate cards; independent upright/reversed orientation
- [x] Stable reading/request IDs and idempotent retries

## Phase 3 — Interpretation engine ✅
- [x] Layer A source meaning
- [x] Layer B context / position interpretation
- [x] Layer C multi-card synthesis
- [x] Waite + Mathers attributed historical comparison
- [x] Source curation, safety framing, structured output, live smoke tests

## Phase 4 — Core Tarot UX ✅
- [x] Question → spread → user card selection → reveal → result
- [x] Responsive desktop/mobile flow
- [x] Fixed-draw error retry
- [x] Vela voice and progressive disclosure of source-heavy analysis

## Phase 5 — Same-reading follow-up ✅
- [x] Preserve the original draw and source context
- [x] Up to six bounded follow-ups
- [x] Browser-session persistence and no-redraw contract tests

## Phase 6 — Accounts and private history ✅

Login remains optional; anonymous use is never blocked.

- [x] Supabase Email/password Auth
- [x] Google OAuth
- [x] Forgot-password / password recovery
- [x] Sign-out and session restoration
- [x] Private cross-device Tarot history
- [x] Anonymous-reading transfer after sign-in
- [x] RLS isolation, deletion controls, 365-day retention
- [x] Verify Google OAuth redirect on production
- [x] Verify Google sign-in on mobile and desktop
- [x] Verify same-email Email/password and Google behavior without an unexpected history silo
- [x] Verify sign-out → reload → sign-back-in session behavior
- [x] Verify password reset end-to-end

**Exit condition met:** user acceptance checks passed on 2026-09-07.

## Phase 7 — Astrology

### 7.1 Scope and data method
- [x] Limit V1 Astrology to 12 tropical sun signs
- [x] Support `daily` and `weekly`
- [x] Keep birthday client-side and send only the selected sign
- [x] Explicitly exclude full natal chart / houses / ascendant / synastry
- [x] Document a deterministic Sun/Moon calculation layer so the model never invents sky positions

### 7.2 Zodiac and sky model
- [x] Add 12-sign structured registry with Traditional Chinese labels
- [x] Add fixed-date birthday helper with manual override
- [x] Add approximate solar and lunar ecliptic longitude calculation
- [x] Add Moon phase and supported Sun–Moon aspect signal generation
- [x] Add deterministic daily and Monday–Sunday weekly context
- [x] Remove false “aspect to the center of the selected Sun sign” precision; never claim a natal aspect without an actual natal degree

### 7.3 Source-grounded Vela astrology engine
- [x] Add validated `/api/astrology/reading`
- [x] Add strict structured output schema
- [x] Prevent invented planets, houses, natal placements, retrogrades, and unsupported aspects
- [x] Reject pre-source prototype astrology results from formal session/history restore
- [x] Verify Sepharial *Astrology: How to Make and Read Your Own Horoscope* (1920) and its Project Gutenberg source
- [x] Verify Alan Leo *Astrology for All* content and use the clearly public-domain 1910 fourth edition as runtime provenance
- [x] Add source metadata, upload fingerprints, edition notes, and public-domain provenance
- [x] Add a structured, attributable astrology source corpus for all 12 Sun signs, Sun/Moon principles, zodiac structure, aspects, transit method, and synthesis method
- [x] Add deterministic evidence selection for sign + actual sky signals before model interpretation
- [x] Separate natal doctrine from current-transit application and explicitly prohibit natal-Moon → transiting-Moon substitution
- [x] Require the model to reason as “book principle → actual sky → contextual synthesis” rather than paraphrasing source prose
- [x] Exclude historical medical/death/physiognomic/gender/racial/class/moral deterministic claims from Vela output
- [x] Return human-readable source references with each formal reading
- [x] Re-enable daily/weekly generation only when canonical source evidence is sufficient

### 7.4 Functional UI
- [x] Replace the Tarot / Astrology / Dream tab-first landing with a conversation-first Vela home
- [x] Place Vela / fortune-teller stage in the center and let the user describe what they care about first
- [x] Let Vela recommend Tarot, Astrology, or Dream based on that message
- [x] Keep Dream visible but unavailable until its own source system exists
- [x] Add 12-sign selection UI and optional birthday-to-sign helper
- [x] Add daily / weekly toggle
- [x] Reduce daily/weekly result headline typography for mobile readability
- [x] Pin account avatar and **我的紀錄** controls to the top-right consistently across modes
- [x] Show interpretation basis, actual sky signals, and attributable book references in the result

### 7.5 Account history integration
- [x] Add `astrology_readings` migration with RLS and 365-day retention
- [x] Add astrology history collection/detail/delete APIs
- [x] Recompute sky context server-side before accepting a saved snapshot
- [x] Recompute canonical source evidence on save/restore instead of trusting client-provided citations
- [x] Merge Tarot + Astrology into the account's **我的紀錄** UI
- [x] Support reopening a saved record even when it belongs to the other experience
- [x] Apply migration `005_astrology_history.sql` to the active Supabase project
- [x] Confirm signed-in Astrology results persist in production history

### 7.6 Tests and finish
- [x] Test 12-sign registry and birthday boundaries
- [x] Test seasonal solar anchors and daily/weekly determinism
- [x] Test request validation and deterministic astrology IDs
- [x] Test prompt contract against invented chart data
- [x] Test unified history / RLS contract
- [x] Test conversation-first landing and fixed account controls
- [x] Add source-fidelity contract tests for natal/transit boundaries, historical-content curation, and source attribution
- [x] Add unit coverage proving all 12 signs have Alan Leo + Sepharial evidence and no sign-center aspect is fabricated
- [x] Confirm source-grounding PR CI lint / test / build green
- [ ] Run final deployed daily + weekly regression smoke tests on both mobile and desktop

**Exit condition:** source-grounded daily/weekly readings work on production with visible references, private astrology history survives a new session, Tarot history still works, and CI is green.

## Phase 8 — Dream interpretation

### 8.1 Scope and source method
- [x] Define source method and what counts as evidence
- [x] Use attributable public-domain Freud/Jung historical psychology provenance
- [x] Treat historical frameworks as reflective hypotheses rather than modern clinical consensus
- [x] Prefer personal associations and waking-life context over a universal symbol dictionary

### 8.2 Dream extraction and evidence
- [x] Extract people, places, objects, actions, emotions, notable images, and bounded themes from user text
- [x] Select source evidence deterministically from extracted themes
- [x] Keep manifest dream content separate from proposed interpretation
- [x] Require each interpretation hypothesis to cite only server-selected evidence IDs

### 8.3 Source-grounded Vela dream engine
- [x] Add validated `/api/dreams/reading`
- [x] Add strict extraction and interpretation schemas
- [x] Separate source principles from Vela contextual interpretation
- [x] Return multiple possible hypotheses instead of one fixed symbolic answer
- [x] Return human-readable source references with each reading
- [x] Prohibit diagnosis, prediction, supernatural certainty, and claims about another person's intentions

### 8.4 Functional UI
- [x] Enable Dream from the conversation-first Vela home
- [x] Carry a dream-like home message into the Dream flow
- [x] Add Dream narrative input and optional waking-life context
- [x] Show notable elements, multiple hypotheses, reflection questions, grounding note, and sources
- [x] Add browser-session restoration
- [x] Keep Dream follow-up bounded in V1 by not adding an open-ended follow-up chat until a source-preserving contract exists

### 8.5 Account history integration
- [x] Add `dream_readings` migration with RLS and 365-day retention
- [x] Add Dream history collection/detail/delete APIs
- [x] Recompute reading ID and canonical source evidence before accepting a saved snapshot
- [x] Merge Tarot + Astrology + Dream into **我的紀錄**
- [x] Support reopening a saved Dream record and cross-mode restore
- [x] Apply migration `006_dream_history.sql` to the active Supabase project
- [x] Confirm signed-in Dream results persist in production history

### 8.6 Tests and finish
- [x] Test Dream request validation and stable IDs
- [x] Test deterministic evidence selection and rejection of unselected evidence IDs
- [x] Test private Dream history snapshot validation
- [x] Test safety framing against diagnosis/prediction/fixed-symbol certainty
- [x] Confirm Phase 8 PR CI lint / test / build green
- [ ] Run final deployed Dream regression smoke tests on both mobile and desktop

**Exit condition:** source-grounded Dream readings work on production with visible references, private Dream history survives a new session, Tarot/Astrology history still works, sensitive-content framing remains non-diagnostic, and CI is green.

## Phase 9 — Final Vela UI / UX
- [x] Extract the home fortune-teller scene into a reusable `VelaStage` component
- [x] Make the crystal ball a real accessible CTA into the conversation-first flow
- [x] Refine the dialogue-first landing with a pink/purple stage atmosphere and responsive desktop/mobile composition
- [x] Add shared focus, disabled, loading/error, and cross-mode atmosphere states
- [x] Respect `prefers-reduced-motion` and keep interaction understandable without animation
- [x] Add an automatic final-art slot at `public/vela/vela-home.webp` with graceful fallback
- [x] Integrate artwork-led home routing and crystal-ball interaction
- [x] Add immersive waiting/auth handoff states without losing anonymous readings
- [ ] Run final deployed visual acceptance on both mobile and desktop after the remaining art pass

**Status:** the production UX is usable and monetization design may proceed; final visual acceptance remains a pre-launch task.

## Phase 10 — Art assets
- [x] Add Vela home artwork used by the current landing experience
- [x] Add crystal-ball artwork used as the home CTA
- [x] Add Tarot back and Tarot face artwork used during the draw/reveal flow
- [ ] Complete any remaining mode-specific Vela variants
- [ ] Complete remaining Zodiac and Dream visual assets
- [ ] Finalize logo, favicon, social preview, empty/loading/error art
- [ ] Run final asset-dimension and responsive acceptance pass

## Phase 11 — Three-mode integration and retention
- [x] Unified home and navigation across Tarot / Astrology / Dream
- [x] Unified Vela Speech / voice and shared status patterns
- [x] Unified private history and cross-mode restore behavior
- [x] Add Reading Quality v3 fixed-case evaluation and deterministic style/safety gates
- [x] Add result sharing while keeping Dream share cards privacy-safe
- [x] Preserve anonymous readings through waiting-stage login / OAuth return
- [x] Add Retention v1 saved-reading continuation with a six-turn bound
- [x] Apply migration `007_retention_conversations.sql` to the active Supabase project
- [x] Confirm signed-in reading results persist in production history
- [ ] Confirm saved-reading continuation survives refresh and sign-out/sign-in on production
- [ ] Run final cross-mode mobile/desktop regression pass

## Phase 12 — Monetization

### 12A — Paid product design ← CURRENT
- [ ] Decide what remains meaningfully useful for free users
- [ ] Decide premium value without intentionally degrading answer quality for free users
- [ ] Define which actions consume quota: new readings, clarifiers, same-reading follow-ups, saved-reading continuations, Astrology refreshes, and Dream follow-ups
- [ ] Decide subscription vs credits vs a deliberately simple hybrid
- [ ] Freeze the first-launch price/limit matrix before adding Checkout
- [ ] Document entitlement rules independently of any payment provider

### 12B — Entitlement and usage engine
- [ ] Add server-side plan / entitlement model tied to authenticated Supabase users
- [ ] Add append-only usage events or equivalent auditable usage accounting
- [ ] Add atomic quota checks so concurrent requests cannot overspend an allowance
- [ ] Make all paid/limited API paths enforce entitlements server-side rather than trusting disabled UI controls
- [ ] Define idempotency behavior so retries do not double-charge usage
- [ ] Add tests for anonymous, free, premium, expired, cancelled, and quota-exhausted states
- [ ] Add cost observability per product action before opening paid access

### 12C — Payment integration
- [ ] Select the payment provider only after the entitlement contract is frozen
- [ ] Add Checkout / purchase flow
- [ ] Add signed webhook verification and idempotent event processing
- [ ] Map successful payment state into provider-agnostic entitlements
- [ ] Handle renewal, cancellation, expiration, payment failure, and refund/reversal states
- [ ] Add subscription-management entry point
- [ ] Test payment lifecycle in sandbox/test mode before production credentials are enabled

### 12D — Paywall and subscription UX
- [ ] Add pricing / plan presentation
- [ ] Show current plan and remaining allowance clearly
- [ ] Add contextual upgrade surfaces only when the user reaches a meaningful limit
- [ ] Preserve the current reading/session when an upgrade is required
- [ ] Add graceful quota-exhausted and payment-recovery states in Vela voice

**Phase 12 rule:** answer quality remains grounded and safe for every tier. Monetization may change allowance, persistence depth, continuation depth, or premium capabilities, but must not intentionally make free interpretations misleading or low quality.

## Phase 13 — Production readiness
- [ ] Production Vercel/Supabase environment audit
- [ ] Rate limiting and abuse protection
- [ ] Global request/token/cost ceilings independent of paid quota
- [ ] Privacy-conscious error logging and analytics
- [ ] Database backup/recovery plan
- [ ] Copyright/source handling review
- [ ] Privacy Policy, Terms, AI/divination disclaimer
- [ ] Security review
- [ ] Full mobile/desktop regression pass
- [ ] Closed beta before public launch

## Post-launch backlog
- Celtic Cross and additional Tarot spreads
- Full natal chart / birth time / birthplace / houses / aspects
- Additional Tarot/astrology/dream sources
- Social/sharing features
- Voice
- Advanced animation and additional Vela outfits
- Native app
