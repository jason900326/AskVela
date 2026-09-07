# AskVela Roadmap

This file is the single development checklist for AskVela. Work follows the phase order below unless a production incident requires otherwise.

## Current status

- Current phase: **Phase 1 — Structured tarot knowledge**
- V1 scope: frozen in [docs/V1_SPEC.md](docs/V1_SPEC.md)
- Existing foundation: Next.js, OpenAI, Supabase/pgvector, PDF extraction, ingestion, grounded Q&A API
- First source: Arthur Edward Waite, *The Pictorial Key to the Tarot*

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

- [ ] Define the canonical 78-card registry and stable card IDs
- [ ] Add Traditional Chinese card names and aliases
- [ ] Define card-section metadata schema
- [ ] Extend the database for card, orientation, section type, and source location
- [ ] Build a parser for *The Pictorial Key to the Tarot*
- [ ] Extract Major Arcana sections
- [ ] Extract Minor Arcana sections
- [ ] Separate description, symbolism, divinatory meaning, and reversed meaning
- [ ] Preserve author, book, chapter, and source location
- [ ] Update ingestion to write structured metadata
- [ ] Update retrieval to filter by card and orientation before semantic ranking
- [ ] Add validation that all 78 cards are present
- [ ] Add representative retrieval tests for Major, Minor, upright, and reversed meanings
- [ ] Confirm Traditional Chinese answers retain English card terminology where useful
- [ ] Confirm insufficient sources produce an explicit limitation

**Exit condition:** Every card and orientation can reliably retrieve the correct Waite material with traceable source metadata.

## Phase 2 — Tarot draw engine

- [ ] Define V1 spread registry
- [ ] Implement the complete 78-card deck
- [ ] Implement server-side unbiased card selection
- [ ] Prevent duplicate cards within one draw
- [ ] Assign upright/reversed orientation independently
- [ ] Create a stable reading/draw ID
- [ ] Make draw retries idempotent
- [ ] Validate question and spread input
- [ ] Add tests for deck completeness, uniqueness, orientation, and spread positions

**Exit condition:** The server can reproducibly create valid single-card and three-card readings without using the language model to select cards.

## Phase 3 — Interpretation engine

- [ ] Create a reading endpoint separate from generic knowledge Q&A
- [ ] Retrieve evidence for every drawn card
- [ ] Build Layer A: source meaning
- [ ] Build Layer B: context and spread-position interpretation
- [ ] Build Layer C: multi-card synthesis
- [ ] Return structured output for reliable UI rendering
- [ ] Include human-readable source references
- [ ] Add safety framing for high-stakes questions
- [ ] Add evaluation cases for source fidelity and hallucination
- [ ] Keep the existing `/api/ask` endpoint as an internal knowledge-quality tool or retire it deliberately

**Exit condition:** A valid draw produces a coherent Traditional Chinese reading that separates source facts from AI synthesis.

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
- [ ] Multiple books and author-by-author comparison
- [ ] Paid usage and entitlements
- [ ] Astrology
- [ ] Dream interpretation
- [ ] Social and sharing features
- [ ] Voice
- [ ] Advanced animation
- [ ] Additional Vela outfits
- [ ] Native app

These items cannot be pulled into V1 without an explicit scope change in [docs/V1_SPEC.md](docs/V1_SPEC.md).
