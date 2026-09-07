# AskVela

Vela is a JavaScript / Next.js reflective-divination web product. The first public product is being built around three experiences: source-grounded Tarot, structured sun-sign Astrology, and Dream interpretation.

## Current status

- Phases 0–6: Tarot core, fixed-draw interpretation, follow-up, optional Supabase Auth, Google OAuth, password recovery, and private cross-device Tarot history are complete.
- **Current: Phase 7 — Astrology.** Code for daily/weekly sun-sign readings and unified Tarot/Astrology history is implemented; production acceptance still requires Supabase migration `005_astrology_history.sql` plus deployed smoke tests.
- Next: Phase 8 — Dream interpretation.

See [ROADMAP.md](ROADMAP.md), [docs/V1_SPEC.md](docs/V1_SPEC.md), and [docs/ASTROLOGY_SPEC.md](docs/ASTROLOGY_SPEC.md).

## What makes Vela different

### Tarot

Tarot does not ask the model to choose cards. A server-verifiable deterministic draw is fixed first, then evidence is retrieved by exact card/orientation and interpreted in three layers:

```text
user-selected card positions
→ deterministic 78-card draw
→ per-card source retrieval
→ Layer A: source meaning
→ Layer B: question + spread-position interpretation
→ Layer C: synthesis
```

V1 Tarot uses Arthur Edward Waite's *The Pictorial Key to the Tarot* and S. L. MacGregor Mathers' *The Tarot* (1888) as separately attributed public-domain sources.

### Astrology

Astrology does not ask the model to invent “today's planets.” Phase 7 computes a small deterministic sky context first:

```text
sun sign + date + daily/weekly
→ approximate Sun/Moon longitudes
→ Moon sign + Moon phase + selected major aspects
→ structured Vela interpretation
```

This is deliberately **not** a full natal-chart engine. Birth time, birthplace, houses, ascendant, full ephemerides, and synastry are outside Astrology V1.

## Stack

- Next.js 16 / React 19
- JavaScript (no TypeScript)
- OpenAI JavaScript SDK
- Supabase Auth + Postgres + pgvector
- `pdf-parse` for public-domain Tarot source extraction
- Node.js 22+

## Main structure

```text
app/
  api/readings/                 # Tarot draw / interpret / follow-up / history
  api/astrology/                # Astrology reading / history
components/
  TarotReadingFlow.js
  AstrologyReadingFlow.js
  VelaExperience.js
  VelaAccount.js
lib/
  tarot-*.js                    # Tarot registry/draw/safety/prompts
  reading-*.js                  # Tarot evidence/interpreter/history/follow-up
  zodiac.js
  astrology-sky.js
  astrology-prompts.js
  astrology-reading.js
  astrology-history.js
data/
  tarot/cards.json
  raw/public-domain/            # public-domain PDFs may be committed
supabase/migrations/
  001_knowledge_base.sql
  002_structured_tarot.sql
  003_historical_comparison_sources.sql
  004_accounts_and_reading_history.sql
  005_astrology_history.sql
```

## Environment

Create `.env.local` with the required values for your active project:

```bash
OPENAI_API_KEY=...
OPENAI_CHAT_MODEL=...
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
# Legacy projects may use NEXT_PUBLIC_SUPABASE_ANON_KEY instead.

SUPABASE_SERVICE_ROLE_KEY=...
TAROT_DRAW_SECRET=...
```

Never expose the Supabase service-role key, OpenAI API key, Tarot draw secret, or Google OAuth client secret in browser/public environment variables.

## Database setup

Apply migrations in order to the same Supabase project referenced by your Vercel environment variables:

```text
001_knowledge_base.sql
002_structured_tarot.sql
003_historical_comparison_sources.sql
004_accounts_and_reading_history.sql
005_astrology_history.sql
```

`005_astrology_history.sql` creates the private Astrology history table, RLS policies, and 365-day retention boundary. Birthday is not stored; only the selected sun sign/date/period, server-recomputed sky context, and generated interpretation are eligible for history.

## Local commands

```bash
npm install
npm run dev
npm run lint
npm test
npm run build
```

Tarot source tooling:

```bash
npm run extract:pdf -- <input.pdf> <output.txt>
npm run parse:waite -- <metadata.json> <input.txt> <output.json>
npm run parse:mathers -- <metadata.json> <input.txt> <output.json>
npm run validate:tarot -- <structured.json>
npm run ingest:tarot -- <metadata.json> <structured.json>
npm run smoke:reading
```

## Source handling

- Public-domain source PDFs may live under `data/raw/public-domain/`.
- Copyrighted/private ebooks must not be committed to the public repository.
- Generated extraction/processed data should stay out of Git unless explicitly intended.
- Difficult historical Tarot themes may be retained as situational concepts, but direct historical person-label wording is curated so it cannot become a stable insult or character judgment.

## Auth and private history

Use of Tarot/Astrology remains possible anonymously. Accounts add durable private history. Supabase RLS is the source of truth for ownership. See [docs/AUTH_SETUP.md](docs/AUTH_SETUP.md).

## Product boundaries

The functional UI is not final art direction. Final Vela character art, backgrounds, Tarot art, zodiac/dream visual assets, and full visual polish are later roadmap phases so the team does not repeatedly redesign layout while core product behavior is still changing.
