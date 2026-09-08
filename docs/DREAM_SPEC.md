# AskVela Dream Interpretation V1

## Scope

Dream V1 accepts a remembered dream plus optional waking-life context, extracts a small deterministic set of entities/themes/emotions, retrieves reviewed historical dream-psychology evidence, and asks Vela to synthesize a reflective interpretation in Traditional Chinese.

Dream V1 is **not** a diagnosis, prophecy, universal dream dictionary, or claim that a symbol has one fixed meaning.

## Source contract

Runtime interpretation uses only reviewed evidence from public-domain sources listed in `docs/DREAM_SOURCES.md`.

The initial corpus intentionally uses two complementary historical lenses:

- Sigmund Freud, *The Interpretation of Dreams* (A. A. Brill translation, 1913): manifest/latent content and dream-work as a historical psychoanalytic framework.
- Havelock Ellis, *The World of Dreams* (1922): observations on emotion, symbolism, memory, flying/falling, and dreams of the dead.

Historical claims are labeled as historical theory/observation. Vela must not present them as modern clinical consensus.

## Request

`POST /api/dreams/reading`

```json
{
  "dreamText": "...",
  "contextText": "optional waking-life context",
  "requestId": "stable client id"
}
```

- `dreamText`: 10–3000 characters.
- `contextText`: optional, at most 800 characters.
- A repeated identical request ID and identical input produces the same reading ID.

## Extraction

The deterministic extraction layer may identify:

- emotions: fear/anxiety, sadness/grief, anger/conflict, joy/relief, confusion
- themes: recurring dream, pursuit/escape, falling/flying, death/grief, school/work/performance, relationship, transition/loss of control
- symbols/entities: people, water, house/room, vehicle/train, animal, teeth, phone, money, door/path, darkness/light

Extraction is a retrieval aid only. Detection of a word does not establish its meaning.

## Interpretation contract

Vela must:

1. summarize the remembered dream without adding events;
2. distinguish source-backed observations from Vela's contextual synthesis;
3. treat symbols as possibilities shaped by the user's own associations;
4. avoid diagnosis, hidden-memory claims, trauma claims, paranormal certainty, and event prediction;
5. offer a small number of reflective connections/questions rather than a definitive verdict;
6. use only the evidence supplied by the server.

## Follow-up boundary

V1 does not create an unbounded dream-therapy chat. A saved dream can be reopened, but a new dream or materially new context starts a new reading. Bounded follow-up can be added later after safety and history behavior are validated.

## Privacy/history

Anonymous use remains available. Signed-in users may save Dream readings privately. The server re-extracts the dream and rebuilds canonical evidence before accepting a history snapshot. Dream history uses RLS and the same 365-day retention policy as Tarot/Astrology.
