# AskVela

Vela is a JavaScript / Next.js reflective-divination web product. The first public product is being built around three experiences: source-grounded Tarot, source-grounded sun-sign Astrology, and Dream interpretation.

## Current status

- Phases 0–6: Tarot core, fixed-draw interpretation, follow-up, optional Supabase Auth, Google OAuth, password recovery, and private cross-device Tarot history are complete.
- **Current: Phase 7 — Astrology deployment acceptance.** The daily/weekly experience now has a source-grounded runtime using Sepharial + Alan Leo, visible references, and corrected natal/transit boundaries. Remaining work is CI, the Astrology history migration, and deployed smoke testing.
- The home experience is Vela-first: the user talks to the centered fortune-teller first, then Vela recommends Tarot, Astrology, or Dream instead of presenting three primary tabs.
- Next after Phase 7: Phase 8 — Dream interpretation.

See [ROADMAP.md](ROADMAP.md), [docs/V1_SPEC.md](docs/V1_SPEC.md), [docs/ASTROLOGY_SPEC.md](docs/ASTROLOGY_SPEC.md), and [docs/ASTROLOGY_SOURCES.md](docs/ASTROLOGY_SOURCES.md).

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

Astrology does not ask the model to invent “today's planets,” nor does it hand a whole old book to the model and ask for a horoscope. Phase 7 separates source doctrine, current sky calculation, and contextual synthesis:

```text
selected Sun sign + date + daily/weekly
→ approximate current Sun/Moon longitudes
→ Moon sign + Moon phase + actual current Sun–Moon aspect (when present)
→ deterministic, scope-labelled evidence from Sepharial + Alan Leo
→ Vela: book principle → actual sky → contextual synthesis
→ visible source references
```

Important boundary: Alan Leo's Moon-in-sign and Sun–Moon combination material is primarily natal doctrine. It is not directly substituted for the current transiting Moon. Likewise, AskVela no longer fabricates a personal aspect to the midpoint of a selected Sun sign; an exact natal aspect requires an actual natal degree.

The Astrology source set currently uses:

- Sepharial, *Astrology: How to Make and Read Your Own Horoscope*, revised/enlarged edition (1920), Project Gutenberg #46963.
- Alan Leo, *Astrology for All*, 4th enlarged edition (1910), sourced from a Public Domain Mark 1.0 institutional scan. A user-provided 1931 sixth edition was cross-checked for content but is not the public-repository rights source.

This is deliberately **not** a full natal-chart engine. Birth time, birthplace, houses, ascendant, full ephemerides, and synastry are outside the first Astrology version.

## Stack

- Next.js 16 / React 19
- JavaScript (no TypeScript)
- OpenAI JavaScript SDK
- Supabase Auth + Postgres + pgvector
- `pdf-parse` for source extraction
- Node.js 22+

## Main structure

```text
app/
  api/readings/                 # Tarot draw / interpret / follow-up / history
  api/astrology/                # Astrology reading / history
components/
  TarotReadingFlow.js
  AstrologyReadingFlow.js
  VelaExperience.js             # Vela-first conversational home
  VelaAccount.js
lib/
  tarot-*.js                    # Tarot registry/draw/safety/prompts
  reading-*.js                  # Tarot evidence/interpreter/history/follow-up
  zodiac.js
  astrology-sky.js              # approximate current Sun/Moon geometry
  astrology-source-corpus.js    # attributable structured historical source principles
  astrology-evidence.js         # deterministic scope-aware evidence selection
  astrology-prompts.js
  astrology-reading.js
  astrology-history.js
  astrology-source-status.js
data/
  metadata/                     # source edition/provenance records
  tarot/cards.json
  raw/public-domain/            # public-domain source PDFs may be committed
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

`005_astrology_history.sql` creates the private Astrology history table, RLS policies, and 365-day retention boundary. It should be applied before relying on source-grounded Astrology history across devices.

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
- Astrology runtime source selection is deterministic and source-attributed; the model cannot invent its own citations.
- Historical astrology claims are curated before use: medical/death predictions, physiognomy, essentialist gender/racial/class claims, and deterministic moral judgments are excluded from Vela output.
