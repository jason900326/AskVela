# AskVela Roadmap

This file is the single development checklist for AskVela. Work follows the phase order below unless a production incident requires otherwise.

## Current status

- Current phase: **Phase 3 — Interpretation engine / multi-source curation and validation**
- V1 scope: frozen in [docs/V1_SPEC.md](docs/V1_SPEC.md)
- Existing foundation: Next.js, OpenAI, Supabase/pgvector, PDF extraction, ingestion, grounded Q&A API
- Primary source: Arthur Edward Waite, *The Pictorial Key to the Tarot*
- Historical comparison source: S. L. MacGregor Mathers, *The Tarot* (1888)

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

### Multi-source curation before Phase 4

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
- [ ] Apply migration `003_historical_comparison_sources.sql` to the active Supabase project
- [ ] Extract and parse the committed Mathers PDF in the working environment
- [ ] Re-ingest Waite through the new curation layer
- [ ] Ingest the curated Mathers structured source
- [ ] Run live two-book retrieval checks for representative Major, Minor, upright, reversed, and court-card cases
- [ ] Run live reading evaluations for relationship/person questions and confirm the model does not call the user or another person bad, wicked, vicious, deceitful, toxic, foolish, or untrustworthy as a character judgment
- [ ] Confirm disagreements between Waite and Mathers remain explicitly attributed to their respective authors

**Exit condition:** A valid draw produces a coherent Traditional Chinese reading grounded in the curated source set; Waite and Mathers remain separately attributable, historical person-label wording cannot become a direct character attack, and live two-book evaluations pass before UX work begins.

## Phase 4 — Core V1 UX

- [ ] Landing and start-reading state
- [ ] Question input state
- [ ] Spread selection state
- [ ] Draw state
- [ ] Reveal state
- [ ] Loading/progress state while sources and interpretation are generated
- [ ] Reading result state
- [ ] Retryable error states that preserve an existing draw
- [ ] Responsive desktop and mobile layouts
- [ ] Accessible keyboard and screen-reader labels
- [ ] Lightweight card reveal motion
- [ ] End-to-end test of the canonical flow

**Exit condition:** A first-time user can complete the entire reading without developer guidance.

## Phase 5 — Follow-up conversation

- [ ] Preserve reading context in the current browser session
- [ ] Add follow-up endpoint and message validation
- [ ] Keep the original cards and sources fixed
- [ ] Clearly separate follow-up from starting a new reading
- [ ] Limit message size and follow-up count
- [ ] Add context-window and cost controls
- [ ] Test that follow-ups never silently redraw cards

**Exit condition:** Users can clarify the same reading without losing context or changing the draw.

## Phase 6 — Accounts and history

Not required for the first usable anonymous V1 flow.

- [ ] Decide anonymous-only versus optional login launch scope
- [ ] Add Supabase Auth if approved
- [ ] Add `readings`, `reading_cards`, and `reading_messages`
- [ ] Add Row Level Security policies
- [ ] Add reading history and deletion controls
- [ ] Add privacy-conscious retention policy

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
