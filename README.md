# AskVela

AskVela is a source-grounded tarot knowledge assistant built with JavaScript, Next.js, OpenAI, Supabase, and pgvector.

The first knowledge source is **Arthur Edward Waite's _The Pictorial Key to the Tarot_**, with the data model designed to support many books and multiple tarot systems later.

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
│   ├── processed/          # generated locally; ignored by git
│   └── raw/                # put PDFs here locally; PDFs are ignored by git
├── lib/
│   ├── openai.js
│   ├── retrieval.js
│   ├── supabase-admin.js
│   └── tarot-prompt.js
├── scripts/
│   ├── extract-pdf.js
│   └── ingest-book.js
└── supabase/
    └── migrations/
        └── 001_knowledge_base.sql
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

## 4. Put the PDF on your computer

Do **not** upload source PDFs to the repository.

Create:

```text
data/raw/
```

Then place the downloaded file there, for example:

```text
data/raw/the-pictorial-key-to-the-tarot.pdf
```

PDF files under `data/raw/` are ignored by git.

## 5. Extract the PDF text

```bash
npm run extract:pdf -- data/raw/the-pictorial-key-to-the-tarot.pdf
```

This generates:

```text
data/processed/the-pictorial-key-to-the-tarot.txt
```

Generated extraction files are also ignored by git because they can be recreated from the local source PDF.

## 6. Create embeddings and ingest the book

The metadata for the first book is already included:

```text
data/metadata/the-pictorial-key-to-the-tarot.json
```

Run:

```bash
npm run ingest -- \
  data/metadata/the-pictorial-key-to-the-tarot.json \
  data/processed/the-pictorial-key-to-the-tarot.txt
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

Open the local Next.js URL and try questions such as:

- `The High Priestess 在 Waite 原書中代表什麼？`
- `The Tower 的正位與逆位有什麼差別？`
- `Waite 如何描述 The Fool 的象徵？`

AskVela retrieves relevant source chunks first, then gives those chunks to the model as the primary source material.

## Adding the second book

You do **not** need a second database or a second RAG system.

Create another metadata file:

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

Then extract and ingest it using the same two scripts. Each chunk keeps its `book_id`, so retrieval can search across many books while preserving source identity.

For copyrighted books, confirm that your intended storage and product use is properly licensed before putting their full text into a commercial knowledge base.

## What this first version does not do yet

The current ingestion is intentionally generic. It semantically chunks the complete book but does not yet build card-specific chapter metadata such as `card_name`, `upright`, `reversed`, or exact printed page references.

The next knowledge-quality upgrade should be a **Tarot structure parser** that recognizes the 78 card sections in _The Pictorial Key to the Tarot_ and stores structured metadata alongside each source chunk. That improves card filtering, citations, and multi-author comparison without changing the overall RAG architecture.
