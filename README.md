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
Next.js /api/ask
    ↓
OpenAI embedding
    ↓
Supabase pgvector similarity search
    ↓
Relevant book chunks
    ↓
OpenAI Responses API
    ↓
Grounded answer + source list
```

`/api/ask` is the current knowledge-quality foundation. The V1 draw and reading APIs will be added as separate responsibilities as described in the roadmap.

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
│   ├── globals.css
│   ├── layout.js
│   └── page.js
├── components/
│   └── TarotAskForm.js
├── data/
│   ├── metadata/
│   │   └── the-pictorial-key-to-the-tarot.json
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
│   ├── supabase-admin.js
│   └── tarot-prompt.js
├── scripts/
│   ├── extract-pdf.js
│   └── ingest-book.js
├── supabase/
│   └── migrations/
│       └── 001_knowledge_base.sql
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
```

`SUPABASE_SERVICE_ROLE_KEY` is server-only. Never expose it in browser code or commit `.env.local`.

## 3. Create the knowledge-base tables

Run the migration in your Supabase project:

```text
supabase/migrations/001_knowledge_base.sql
```

It creates:

- `books`
- `knowledge_chunks`
- a 1536-dimensional pgvector embedding column
- HNSW vector index
- `match_knowledge_chunks(...)` retrieval RPC

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

## 6. Create embeddings and ingest the book

The metadata for the first book is included at:

```text
data/metadata/the-pictorial-key-to-the-tarot.json
```

Run the extraction command first, then pass the generated text path to:

```bash
npm run ingest -- \
  data/metadata/the-pictorial-key-to-the-tarot.json \
  data/processed/<generated-file>.txt
```

The ingestion script will:

1. upsert the book into `books`
2. split the extracted text into overlapping chunks
3. create 1536-dimensional embeddings
4. replace that book's old chunks on re-ingestion
5. store chunks and embeddings in Supabase

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

## Next knowledge-quality upgrade

The current ingestion semantically chunks the complete book, but does not yet create reliable card-specific metadata such as `card_id`, `card_name`, `upright`, `reversed`, section type, or precise source location.

The next implementation phase is the **Tarot structure parser** in [ROADMAP.md](ROADMAP.md). It must recognize all 78 card sections in _The Pictorial Key to the Tarot_ and attach structured metadata before the complete draw-and-interpretation flow is built.
