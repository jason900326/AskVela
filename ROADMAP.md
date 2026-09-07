# AskVela Roadmap

This file is the single development checklist for AskVela. Work follows the phase order below unless a production incident requires otherwise.

## Current status

- Current phase: **Phase 7 — production readiness**
- V1 scope: frozen in [docs/V1_SPEC.md](docs/V1_SPEC.md)
- Existing foundation: Next.js, OpenAI, Supabase/pgvector, PDF extraction, ingestion, grounded Q&A API
- Primary source: Arthur Edward Waite, *The Pictorial Key to the Tarot*
- Historical comparison source: S. L. MacGregor Mathers, *The Tarot* (1888)
- Vela voice contract: [docs/VELA_VOICE.md](docs/VELA_VOICE.md)

## Phase 0 — Freeze V1 scope

- [x] Define the one-sentence V1 product
- [x] Freeze the canonical user flow
- [x] Define V1 spreads
- [x] Define source-grounding rules
- [x] Define explicit out-of-scope features
- [x] Define V1 acceptance criteria
- [x] Record minimum draw, reading, and follow-up contracts
- [x] Correct README guidance for committed public-domain PDFs

**Exit condition:** The team can decide whether a request belongs in V1 without redesigning the product.

## Phase 1 — Structured tarot knowledge

- [x] Define the canonical 78-card registry and stable card IDs
- [x] Add Traditional Chinese card names and aliases
- [x] Define card-section metadata schema
- [x] Extend the database for card, orientation, section type, and source location
- [x] Build a parser for *The Pictorial Key to the Tarot*
- [x] Extract Major Arcana sections
- [x] Extract Minor Arcana sections
- [x] Separate description, symbolism, divinatory meaning, and reversed meaning
- [x] Preserve author, book, chapter, and source location
- [x] Update ingestion to write structured metadata
- [x] Update retrieval to filter by card and orientation before semantic ranking
- [x] Add validation that all 78 cards are present
- [x] Add parser and query-identification tests for Major, Minor, upright, and reversed meanings
- [x] Apply migration `002_structured_tarot.sql` to the active Supabase project
- [x] Run structured ingestion for the Waite source in the active Supabase project
- [x] Run live retrieval checks for representative Major, Minor, upright, and reversed queries
- [x] Confirm Traditional Chinese answers retain English card terminology where useful
- [x] Confirm insufficient sources produce an explicit limitation

**Exit condition:** Every card and orientation can reliably retrieve the correct Waite material with traceable source metadata.

## Phase 2 — Tarot draw engine

- [x] Define V1 spread registry
- [x] Implement the complete 78-card deck
- [x] Implement server-side unbiased card selection
- [x] Prevent duplicate cards within one draw
- [x] Assign upright/reversed orientation independently
- [x] Create a stable reading/draw ID
- [x] Make draw retries idempotent
- [x] Validate question and spread input
- [x] Add tests for deck completeness, uniqueness, orientation, and spread positions

**Exit condition:** The server can reproducibly create valid single-card and three-card readings without using the language model to select cards.

## Phase 3 — Interpretation engine

### Core engine

- [x] Create a reading endpoint separate from generic knowledge Q&A
- [x] Retrieve evidence for every drawn card
- [x] Build Layer A: source meaning
- [x] Build Layer B: context and spread-position interpretation
- [x] Build Layer C: multi-card synthesis
- [x] Return structured output for reliable UI rendering
- [x] Include human-readable source references
- [x] Add safety framing for high-stakes questions
- [x] Add evaluation cases for source fidelity and hallucination
- [x] Keep the existing `/api/ask` endpoint as an internal knowledge-quality tool

### Multi-source curation and live validation

- [x] Add Mathers 1888 as a second public-domain historical comparison source
- [x] Add Mathers metadata without falsely labeling it as Rider-Waite-Smith
- [x] Add a 78-card upright/reversed Mathers parser
- [x] Support `meanings_only` historical sources without weakening full-reference validation
- [x] Add retrieval compatibility for historical comparison sources while preserving their native tarot system
- [x] Balance per-card evidence so one book cannot silently crowd the other out
- [x] Add pre-retrieval source curation for insulting, gendered, complexion-based, and direct moral person labels
- [x] Preserve difficult abstract themes such as deceit, conflict, mistrust, and treachery as situational concepts rather than deleting them
- [x] Add Layer A/B/C rules that prohibit turning source themes into stable judgments of the user or a third party
- [x] Require author-by-author attribution when sources differ instead of creating a false consensus
- [x] Add parser, curation, evidence-balancing, and prompt regression tests
- [x] Validate extraction, 78-card parsing, and structured-source validation against both committed PDFs in CI
- [x] Apply migration `003_historical_comparison_sources.sql` to the active Supabase project
- [x] Re-ingest Waite through the new curation layer
- [x] Ingest the curated Mathers structured source
- [x] Run live two-book knowledge retrieval checks for Major, Minor, reversed, court-card, and author-comparison cases
- [x] Confirm live knowledge answers preserve difficult themes without directly labeling the user or a third party as bad, wicked, vicious, deceitful, toxic, foolish, or untrustworthy
- [x] Confirm disagreements between Waite and Mathers remain explicitly attributed to their respective authors
- [x] Make `/api/ask` respect an explicitly requested author instead of showing unrelated source books
- [x] Mark curated retrieval wording as non-verbatim and prohibit quote-style presentation of normalized source text
- [x] Make fixed-reading retrieval query both V1 books separately and fail loudly instead of silently degrading to one source
- [x] Add a `smoke:reading` command that exercises the real fixed draw → evidence → Layer A/B/C interpretation pipeline
- [x] Run the final live `npm run smoke:reading` check against the active Supabase/OpenAI environment

**Exit condition:** A valid fixed draw produces a coherent Traditional Chinese reading grounded in both curated V1 sources; Waite and Mathers remain separately attributable, historical person-label wording cannot become a direct character attack, and the live `smoke:reading` check passes before UX work begins.

## Phase 4 — Core V1 UX

- [x] Landing and start-reading state
- [x] Question input state
- [x] Spread selection state
- [x] Draw state
- [x] Reveal state
- [x] Loading/progress state while sources and interpretation are generated
- [x] Reading result state
- [x] Retryable error states that preserve an existing draw
- [x] Responsive desktop and mobile layouts
- [x] Accessible keyboard and screen-reader labels
- [x] Lightweight card reveal motion
- [x] Add concise, conversational Vela voice guidance and regression tests
- [x] Layer the result UI so the short reading is primary and source-heavy analysis is collapsed by default
- [x] End-to-end test of the canonical flow

The canonical anonymous flow was manually exercised through the deployed UI through question → spread → draw → reveal → interpretation → result. Automated Phase 4 contract tests protect the stage sequence, fixed-draw retry path, progressive disclosure, and result typography; CI continues to cover lint, unit tests, source validation, and build.

**Exit condition:** A first-time user can complete the entire reading without developer guidance.

## Phase 5 — Follow-up conversation

- [x] Preserve reading context in the current browser session
- [x] Add follow-up endpoint and message validation
- [x] Keep the original cards and sources fixed
- [x] Clearly separate follow-up from starting a new reading
- [x] Limit message size and follow-up count
- [x] Add context-window and cost controls
- [x] Test that follow-ups never silently redraw cards

The anonymous browser session now keeps the current reading and follow-up thread in `sessionStorage`. Each follow-up rebuilds and verifies the original deterministic draw from the original question, spread, request ID, and reading ID before retrieving the same curated V1 source set. Follow-up messages are capped at 320 characters and six exchanges per reading; only the four most recent exchanges, bounded evidence excerpts, and a compact initial reading enter one structured model call. Automated tests protect the fixed-card identity, validation limits, session behavior, and no-redraw contract.

**Exit condition:** Users can clarify the same reading without losing context or changing the draw.

## Phase 6 — Accounts and history

Login is optional: the complete anonymous flow remains available, and an account adds durable cross-device history.

- [x] Decide anonymous-only versus optional login launch scope
- [x] Add Supabase Auth if approved
- [x] Add `readings`, `reading_cards`, and `reading_messages`
- [x] Add Row Level Security policies
- [x] Add reading history and deletion controls
- [x] Add privacy-conscious retention policy

Signed-in readings are saved automatically after the initial interpretation and after each follow-up. An anonymous reading is transferred into the account after sign-in without redrawing its cards. The server verifies the deterministic draw before accepting a snapshot; RLS isolates all reading, card, and message rows by `auth.uid()`. Users can reopen a reading across devices, delete one reading, or clear all history. Records expire 365 days after their latest save. Prior readings are never silently included in a new model request; history becomes active context only when the owner explicitly opens that reading.

**Exit condition:** Account data is isolated, recoverable, and user-controlled.

## Phase 7 — Production readiness

- [ ] Configure production Vercel and Supabase environments
- [ ] Add rate limiting and abuse protection
- [ ] Add request, token, and cost limits
- [ ] Add error logging without storing unnecessary sensitive questions
- [ ] Add analytics for funnel completion
- [ ] Add database backup/recovery plan
- [ ] Review public-domain and copyrighted-source handling
- [ ] Add Privacy Policy
- [ ] Add Terms of Use
- [ ] Add AI/tarot disclaimer
- [ ] Run security review
- [ ] Run mobile/desktop smoke tests
- [ ] Confirm CI lint and build pass
- [ ] Conduct a small closed beta before public launch

**Exit condition:** AskVela can be safely operated and monitored for real users.

## Phase 8 — Post-V1 backlog

- [ ] Celtic Cross and additional spreads
- [ ] Additional books beyond the curated V1 source set and author-by-author comparison UI
- [ ] Paid usage and entitlements
- [ ] Astrology
- [ ] Dream interpretation
- [ ] Social and sharing features
- [ ] Voice
- [ ] Advanced animation
- [ ] Additional Vela outfits
- [ ] Native app

These items cannot be pulled into V1 without an explicit scope change in [docs/V1_SPEC.md](docs/V1_SPEC.md).
