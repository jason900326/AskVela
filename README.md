# AskVela

Vela (repository name: AskVela) is a source-grounded AI tarot reading website built with JavaScript, Next.js, OpenAI, Supabase, and pgvector.

The V1 product is intentionally narrow:

> 一個有可靠書籍依據、能進行 AI 塔羅占卜的網站。

The primary knowledge source is **Arthur Edward Waite's _The Pictorial Key to the Tarot_**. Phase 3 also uses **S. L. MacGregor Mathers' _The Tarot_ (1888)** as an attributed historical comparison source. Different authors are never blended into a false consensus.

## Project status

Vela now has the complete anonymous reading flow, same-reading follow-ups, optional Supabase login, and private cross-device reading history. Work has moved to production readiness.

- Current phase: Phase 7 — production readiness
- V1 specification: [docs/V1_SPEC.md](docs/V1_SPEC.md)
- Development checklist: [ROADMAP.md](ROADMAP.md)

The frozen V1 flow is:

```text
Enter AskVela
→ enter a question
→ choose a spread
→ draw cards
→ reveal cards
→ retrieve relevant book evidence
→ generate a complete AI interpretation
→ ask follow-up questions
```

Astrology, dream interpretation, social features, voice, complex animation, native apps, and multi-tier payment plans are outside V1.

## Current architecture

```text
Fixed server-side draw
    ↓
Per-card exact ID + orientation retrieval
    ↓
Balanced evidence across compatible source books
    ↓
Retrieval-facing historical source curation
    ↓
Layer A: source-only meaning, author-by-author
    ↓
Layer B: question + spread-position interpretation
    ↓
Layer C: cross-card synthesis
    ↓
Structured reading + human-readable sources + safety framing
```

The source-curation layer does **not** erase difficult tarot themes. Concepts such as deception, conflict, mistrust, selfishness, or treachery may remain when they are present in a source. What is removed or reframed is historical wording that directly labels a person as, for example, a bad, wicked, vicious, foolish, suspicious, or inherently untrustworthy person. The interpretation prompts then add a second defense by requiring these themes to be discussed as possible dynamics or behaviors rather than character judgments about the user or a third party.

`/api/ask` remains an internal knowledge-quality tool. `/api/readings/draw` owns the server-side draw, and `/api/readings/interpret` regenerates that exact draw from the same request ID before interpreting it. The language model therefore cannot choose cards or silently change an existing draw.

## Stack

- Next.js 16
- React 19
- JavaScript (no TypeScript)
- OpenAI JavaScript SDK
- Supabase Postgres + pgvector
- `pdf-parse` for local PDF extraction

## Repository structure

```text
AskVela/
├── app/
│   ├── api/ask/route.js
│   ├── api/readings/draw/route.js
│   ├── api/readings/interpret/route.js
│   ├── api/spreads/route.js
│   ├── globals.css
│   ├── layout.js
│   └── page.js
├── components/
│   └── TarotAskForm.js
├── data/
│   ├── metadata/
│   │   ├── the-pictorial-key-to-the-tarot.json
│   │   └── the-tarot-macgregor-mathers-1888.json
│   ├── tarot/
│   │   └── cards.json                # canonical 78-card registry
│   ├── processed/                    # generated locally; ignored by git
│   └── raw/
│       ├── public-domain/            # public-domain sources may be committed
│       ├── copyrighted/              # ignored; do not commit
│       └── private/                  # ignored; do not commit
├── docs/
│   └── V1_SPEC.md
├── lib/
│   ├── mathers-structure-parser.js
│   ├── openai.js
│   ├── reading-evidence.js
│   ├── reading-interpreter.js
│   ├── reading-prompts.js
│   ├── retrieval.js
│   ├── source-curation.js
│   ├── structured-tarot-validation.js
│   ├── supabase-admin.js
│   ├── tarot-cards.js
│   ├── tarot-draw.js
│   ├── tarot-prompt.js
│   ├── tarot-safety.js
│   ├── tarot-spreads.js
│   └── waite-structure-parser.js
├── scripts/
│   ├── extract-pdf.js
│   ├── ingest-book.js
│   ├── ingest-tarot-book.js
│   ├── parse-mathers.js
│   ├── parse-waite.js
│   └── validate-tarot-structure.js
├── supabase/
│   └── migrations/
│       ├── 001_knowledge_base.sql
│       ├── 002_structured_tarot.sql
│       └── 003_historical_comparison_sources.sql
├── test/
│   ├── mathers-structure-parser.test.js
│   ├── reading-evidence.test.js
│   ├── reading-interpreter.test.js
│   ├── reading-prompts.test.js
│   ├── source-curation.test.js
│   ├── tarot-cards.test.js
│   ├── tarot-draw.test.js
│   ├── tarot-safety.test.js
│   └── waite-structure-parser.test.js
└── ROADMAP.md
```

## 1. Install

Node.js **22.3+** is recommended.

```bash
npm install
```

## 2. Environment variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in:

```env
OPENAI_API_KEY=...
OPENAI_CHAT_MODEL=gpt-5.5
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=... # preferred
NEXT_PUBLIC_SUPABASE_ANON_KEY=...        # supported legacy fallback
SUPABASE_SERVICE_ROLE_KEY=...
TAROT_DRAW_SECRET=... # at least 32 random characters
```

The publishable key (or legacy anon key) is intentionally safe for browser use when Row Level Security is enabled. `SUPABASE_SERVICE_ROLE_KEY` and `TAROT_DRAW_SECRET` are server-only. Never expose those server-only values in browser code or commit `.env.local`.

## Draw API

List the three frozen V1 spreads with `GET /api/spreads`. Create a draw with:

```http
POST /api/readings/draw
Content-Type: application/json
Idempotency-Key: <a new client-generated UUID for this reading>

{
  "question": "我最近是否適合換工作？",
  "spreadId": "situation-obstacle-advice"
}
```

Use a new idempotency key only when the user intentionally starts a new reading. Reuse the same key when retrying a failed request; the server will return the same reading ID, cards, positions, and orientations. The supported spread IDs are `single-guidance`, `past-present-future`, and `situation-obstacle-advice`.

## Interpretation API

After revealing a draw, generate its interpretation with the same question, spread, reading ID, and idempotency key:

```http
POST /api/readings/interpret
Content-Type: application/json
Idempotency-Key: <the same UUID used for the draw>

{
  "readingId": "the-reading-id-returned-by-draw",
  "question": "我最近是否適合換工作？",
  "spreadId": "situation-obstacle-advice"
}
```

The server first reproduces and verifies the fixed draw, then performs three separate structured model calls:

1. **Layer A — Source meaning:** summarizes only retrieved book evidence, keeps authors separately attributed, and returns validated source IDs.
2. **Layer B — Context interpretation:** applies Layer A to the question, orientation, and spread position without pretending that inference came from the author.
3. **Layer C — Synthesis:** turns the individual cards into a coherent movement, tension, or progression and returns practical reflection prompts.

The response keeps these boundaries visible through each card's `sourceMeaning` and `contextInterpretation`, plus a top-level `synthesis`. It also includes human-readable book, author, tarot system, chapter, section, and PDF page references. Questions detected as medical, legal, financial, or crisis-related receive deterministic safety notices in addition to stricter model instructions.

## 3. Create the knowledge-base tables

Run all migrations in order in your Supabase project:

```text
supabase/migrations/001_knowledge_base.sql
supabase/migrations/002_structured_tarot.sql
supabase/migrations/003_historical_comparison_sources.sql
supabase/migrations/004_accounts_and_reading_history.sql
```

The third migration adds source-system compatibility so a historical comparison work can participate in an RWS reading without being falsely relabeled as an RWS-native book. The retrieval RPC still filters by the requested reading system.

The schema provides:

- `books`
- `knowledge_chunks`
- `tarot_cards`
- a 1536-dimensional pgvector embedding column
- HNSW vector index
- card/orientation/source-location columns
- compatible tarot-system metadata
- `match_structured_tarot_chunks(...)`, which filters structurally before vector ranking

The retrieval RPC is restricted to the Supabase `service_role` because AskVela calls it server-side.

The fourth migration adds optional email/password accounts and user-owned reading history. It creates `readings`, `reading_cards`, and `reading_messages`, applies Row Level Security, and adds the atomic `save_reading_history(...)` RPC. See [docs/PHASE6_ACCOUNTS.md](docs/PHASE6_ACCOUNTS.md) for Auth redirect, retention, deletion, and memory-boundary details.

## 4. Source-book storage policy

Public-domain source books may be committed under:

```text
data/raw/public-domain/
```

The committed V1 source set is:

```text
data/raw/public-domain/The-Pictorial-Key-to-the-Tarot.pdf
data/raw/public-domain/the-tarot-macgregor-mathers-1888.pdf
```

Copyrighted or private ebooks must not be committed. Store local copies only under:

```text
data/raw/copyrighted/
data/raw/private/
```

Both directories are ignored by git. Confirm licensing before using copyrighted full text in a commercial knowledge base.

## 5. Extract PDF text

Extract both committed public-domain PDFs:

```bash
npm run extract:pdf -- data/raw/public-domain/The-Pictorial-Key-to-the-Tarot.pdf
npm run extract:pdf -- data/raw/public-domain/the-tarot-macgregor-mathers-1888.pdf
```

This generates local text files under `data/processed/`. Generated extraction files are ignored because they can be rebuilt from the permitted sources.

## 6. Parse, validate, and ingest structured tarot knowledge

### Waite

```bash
npm run parse:waite -- \
  data/metadata/the-pictorial-key-to-the-tarot.json \
  data/processed/The-Pictorial-Key-to-the-Tarot.txt

npm run validate:tarot -- \
  data/processed/The-Pictorial-Key-to-the-Tarot.structured.json

npm run ingest:tarot -- \
  data/metadata/the-pictorial-key-to-the-tarot.json \
  data/processed/The-Pictorial-Key-to-the-Tarot.structured.json
```

### Mathers 1888

```bash
npm run parse:mathers -- \
  data/metadata/the-tarot-macgregor-mathers-1888.json \
  data/processed/the-tarot-macgregor-mathers-1888.txt

npm run validate:tarot -- \
  data/processed/the-tarot-macgregor-mathers-1888.structured.json

npm run ingest:tarot -- \
  data/metadata/the-tarot-macgregor-mathers-1888.json \
  data/processed/the-tarot-macgregor-mathers-1888.structured.json
```

The structured workflow will:

1. identify all 78 cards using stable IDs and Traditional Chinese aliases
2. preserve upright/reversed evidence and, where the source provides it, description/symbolism as separate sections
3. record book, author, native tarot system, chapter, source location, and parser profile
4. validate deck completeness and required orientation evidence
5. curate retrieval-facing historical person-label wording before embeddings are created
6. upsert the canonical card registry and book record
7. create embeddings within each curated structured section
8. replace only that book's previous chunks

Mathers is a `meanings_only` source and a `secondary_historical_reference`. It predates the Rider-Waite-Smith deck. Its evidence may be compared with Waite, but disagreements must remain author-attributed rather than being blended together.

`npm run ingest` remains available for non-tarot source material, but tarot books should use a source-specific parser and `ingest:tarot` so card metadata and source curation are never discarded.

## 7. Run AskVela

```bash
npm run dev
```

Use `/api/ask` as a development knowledge-quality tool and `/api/readings/interpret` for the fixed-draw reading pipeline. During Phase 3 evaluation, explicitly test questions that could tempt the model into judging a person, for example relationship, trust, conflict, and loyalty questions. The expected behavior is to describe possible dynamics and observable concerns, not declare the user or another person to be inherently bad, deceitful, toxic, malicious, disloyal, foolish, or untrustworthy.

## Adding another book later

Do **not** create a second database or RAG system. Add another metadata record and ingest it into the same source-aware schema.

```json
{
  "slug": "another-tarot-book",
  "title": "Another Tarot Book",
  "author": "Author Name",
  "tarot_system": "Rider-Waite-Smith",
  "compatible_tarot_systems": ["Rider-Waite-Smith"],
  "publication_year": 2020,
  "public_domain": false,
  "metadata": {
    "language": "en",
    "source_type": "book",
    "role": "secondary_reference"
  }
}
```

Every chunk must preserve its source identity. Multi-book output must present agreements and disagreements explicitly instead of blending authors together.

## Current phase status

Phase 1 is complete: the Waite parser and live knowledge path cover all 78 cards, Major and Minor Arcana, upright and reversed evidence, and traceable source locations.

Phase 2 is complete: the server exposes three V1 spreads and creates idempotent, non-repeating draws with independently assigned upright/reversed orientations.

Phase 3's core interpretation engine is implemented, but **Phase 3 is not yet closed**. Before Phase 4 begins, migration `003_historical_comparison_sources.sql` must be applied to the active Supabase project, both books must be ingested through the curation layer, and live two-book evaluations must confirm source attribution and nonjudgmental person-related readings. Continue to use [ROADMAP.md](ROADMAP.md) as the source of truth.
