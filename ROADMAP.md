# AskVela Roadmap

This file is the single development checklist for AskVela. Work follows the phase order below unless a production incident requires otherwise.

## Current status

- Current phase: **Phase 7 — Astrology (deployment acceptance)**
- Launch scope: Tarot + Astrology + Dream interpretation, followed by final visual integration and production hardening
- Product scope: [docs/V1_SPEC.md](docs/V1_SPEC.md)
- Astrology contract: [docs/ASTROLOGY_SPEC.md](docs/ASTROLOGY_SPEC.md)
- Astrology source provenance: [docs/ASTROLOGY_SOURCES.md](docs/ASTROLOGY_SOURCES.md)
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
- [ ] Apply migration `005_astrology_history.sql` to the active Supabase project

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
- [ ] Run deployed daily + weekly + history smoke tests on mobile and desktop

**Exit condition:** source-grounded daily/weekly readings work on production with visible references, private astrology history survives a new session, Tarot history still works, and CI is green.

## Phase 8 — Dream interpretation
- [ ] Define source method and what counts as evidence
- [ ] Extract dream entities/themes/emotions from user text
- [ ] Build grounded dream-symbol / psychology retrieval
- [ ] Separate source claims from Vela contextual interpretation
- [ ] Add Dream UI and follow-up boundaries
- [ ] Add private Dream history to **我的紀錄**
- [ ] Test sensitive-content framing and avoid treating symbolic interpretations as diagnosis

## Phase 9 — Final Vela UI / UX
- [ ] Replace the current CSS fortune-teller placeholder with the final illustrated Vela character
- [ ] Refine the dialogue-first landing around the final artwork and crystal-ball composition
- [ ] Finalize responsive navigation, account UI, loading/error/empty states
- [ ] Audit accessibility and motion preferences

## Phase 10 — Art assets
- [ ] Vela main character and mode-specific variants
- [ ] Landing/background assets
- [ ] Crystal ball / Tarot back / Tarot faces
- [ ] Zodiac and Dream visual assets
- [ ] Logo, favicon, social preview, empty/loading/error art
- [ ] Lock asset dimensions before replacing placeholders

## Phase 11 — Three-mode integration
- [ ] Unified home and navigation
- [ ] Unified Vela voice and status patterns
- [ ] Unified private history filters and restore behavior
- [ ] Cross-mode mobile/desktop regression pass

## Phase 12 — Paid product decisions
- [ ] Decide free limits and premium value
- [ ] Decide entitlement model only after all three core experiences are usable
- [ ] Add payments after pricing/limits are frozen

## Phase 13 — Production readiness
- [ ] Production Vercel/Supabase environment audit
- [ ] Rate limiting and abuse protection
- [ ] Request/token/cost limits
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
