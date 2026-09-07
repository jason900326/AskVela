# AskVela

AskVela is a source-grounded AI tarot reading website built with JavaScript, Next.js, OpenAI, Supabase, and pgvector.

The V1 product is intentionally narrow:

> 一個有可靠書籍依據、能進行 AI 塔羅占卜的網站。

The first knowledge source is **Arthur Edward Waite's _The Pictorial Key to the Tarot_**. The data model is intended to support additional books and tarot systems later without mixing different authors into a false consensus.

## Project status

AskVela currently has a working source-grounded knowledge Q&A foundation. It does **not** yet provide the complete V1 reading flow.

- Current phase: structured 78-card tarot knowledge
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
User question
    ↓
Card + orientation identification
    ↓
Next.js /api/ask
    ↓
OpenAI embedding
    ↓
Exact card/orientation database filter
    ↓
pgvector ranking inside the filtered source material
    ↓
OpenAI Responses API
    ↓
Grounded answer + source list
```

`/api/ask` remains the knowledge-quality tool. `/api/readings/draw` now owns the
server-side draw, while interpretation will be added as a separate Phase 3
responsibility so the language model can never choose or silently change cards.

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
│   ├── api/spreads/route.js
│   ├── globals.css
│   ├── layout.js
│   └── page.js
├── components/
│   └── TarotAskForm.js
├── data/
│   ├── metadata/
│   │   └── the-pictorial-key-to-the-tarot.json
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
│   ├── openai.js
│   ├── retrieval.js
│   ├── tarot-draw.js
│   ├── tarot-spreads.js
│   ├── supabase-admin.js
│   ├── tarot-cards.js
│   ├── tarot-prompt.js
│   └── waite-structure-parser.js
├── scripts/
│   ├── extract-pdf.js
│   ├── ingest-book.js
│   ├── ingest-tarot-book.js
│   ├── parse-waite.js
│   └── validate-tarot-structure.js
├── supabase/
│   └── migrations/
│       ├── 001_knowledge_base.sql
│       └── 002_structured_tarot.sql
├── test/
│   ├── tarot-cards.test.js
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
SUPABASE_SERVICE_ROLE_KEY=...
TAROT_DRAW_SECRET=... # at least 32 random characters
```

`SUPABASE_SERVICE_ROLE_KEY` and `TAROT_DRAW_SECRET` are server-only. Never expose
them in browser code or commit `.env.local`.

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

Use a new idempotency key only when the user intentionally starts a new reading.
Reuse the same key when retrying a failed request; the server will return the same
reading ID, cards, positions, and orientations. The supported spread IDs are
`single-guidance`, `past-present-future`, and `situation-obstacle-advice`.

## 3. Create the knowledge-base tables

Run both migrations in order in your Supabase project:

```text
supabase/migrations/001_knowledge_base.sql
supabase/migrations/002_structured_tarot.sql
```

It creates:

- `books`
- `knowledge_chunks`
- `tarot_cards`
- a 1536-dimensional pgvector embedding column
- HNSW vector index
- card/orientation/source-location columns
- `match_structured_tarot_chunks(...)`, which filters structurally before vector ranking

The retrieval RPC is restricted to the Supabase `service_role` because AskVela calls it server-side.

## 4. Source-book storage policy

Public-domain source books may be committed under:

```text
data/raw/public-domain/
```

The first committed source is:

```text
data/raw/public-domain/The-Pictorial-Key-to-the-Tarot.pdf
```

Copyrighted or private ebooks must not be committed. Store local copies only under:

```text
data/raw/copyrighted/
data/raw/private/
```

Both directories are ignored by git. Confirm licensing before using copyrighted full text in a commercial knowledge base.

## 5. Extract PDF text

For the committed Waite source:

```bash
npm run extract:pdf -- data/raw/public-domain/The-Pictorial-Key-to-the-Tarot.pdf
```

This generates a local text file under `data/processed/`. Generated extraction files are ignored because they can be rebuilt from the permitted source.

## 6. Parse, validate, and ingest structured tarot knowledge

The metadata for the first book is included at:

```text
data/metadata/the-pictorial-key-to-the-tarot.json
```

Run the extraction command first, then parse all 78 card sections:

```bash
npm run parse:waite -- \
  data/metadata/the-pictorial-key-to-the-tarot.json \
  data/processed/The-Pictorial-Key-to-the-Tarot.txt
```

Validate the generated structure before any database write:

```bash
npm run validate:tarot -- \
  data/processed/The-Pictorial-Key-to-the-Tarot.structured.json
```

After applying both migrations, create embeddings and replace the old unstructured chunks:

```bash
npm run ingest:tarot -- \
  data/metadata/the-pictorial-key-to-the-tarot.json \
  data/processed/The-Pictorial-Key-to-the-Tarot.structured.json
```

The structured workflow will:

1. identify all 78 cards using stable IDs and Traditional Chinese aliases
2. preserve description/symbolism, upright, reversed, and additional Waite meanings as separate source sections
3. record book, author, chapter, PDF page, and source URL
4. validate deck completeness and required orientation evidence
5. upsert the canonical card registry and book record
6. create embeddings within each structured section
7. replace that book's old unstructured chunks

`npm run ingest` remains available for non-tarot source material, but tarot books should use a source-specific parser and `ingest:tarot` so card metadata is never discarded.

## 7. Run AskVela

```bash
npm run dev
```

Open the local Next.js URL and use the current knowledge Q&A page to test retrieval, for example:

- `The High Priestess 在 Waite 原書中代表什麼？`
- `The Tower 的正位與逆位有什麼差別？`
- `Waite 如何描述 The Fool 的象徵？`

This page is a development foundation, not yet the complete V1 tarot-reading experience.

## Adding another book later

Do **not** create a second database or RAG system. Add another metadata record and ingest it into the same source-aware schema.

```json
{
  "slug": "another-tarot-book",
  "title": "Another Tarot Book",
  "author": "Author Name",
  "tarot_system": "Rider-Waite-Smith",
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

Phase 1 is complete: the Waite parser and live knowledge path cover all 78 cards,
Major and Minor Arcana, upright and reversed evidence, and traceable source
locations.

Phase 2 is also complete: the server exposes three V1 spreads and creates
idempotent, non-repeating draws with independently assigned upright/reversed
orientations. Phase 3 will retrieve evidence for those fixed cards and produce
the source/context/synthesis interpretation layers. Continue to use
[ROADMAP.md](ROADMAP.md) as the source of truth.
