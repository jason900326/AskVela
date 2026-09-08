# AskVela Dream Interpretation — Phase 8 Contract

Dream interpretation is a reflective reading, not diagnosis, therapy, prediction, or a fixed symbol dictionary.

## Primary source

AskVela Dream uses the public-domain 1913 English translation of Sigmund Freud's *The Interpretation of Dreams* (A. A. Brill translation, Macmillan; Project Gutenberg 66048) as its primary historical framework.

The source text is imported from Project Gutenberg and ingested into the existing `books` / `knowledge_chunks` vector store. Dream requests retrieve relevant chunks from that full-book index before Vela produces the reading.

C. G. Jung's *Psychology of the Unconscious* remains registered as a possible future secondary framework, but it is not auto-selected by the default Dream flow.

## Runtime source modes

- `freud-full-book-rag`: the Freud book exists in the vector store and relevant source chunks were retrieved for this reading. These retrieved passages are the primary textual basis.
- `curated-public-domain-principles`: temporary fallback when the full-book index is unavailable or retrieval fails. The reading may still use the small curated Freud principle corpus, but the UI must clearly say that full-text retrieval was not available.

The product must never claim full-book retrieval when no retrieved chunks were actually returned.

## Product direction

- Freud is the default historical framework.
- A user can start with one remembered image, object, action, or feeling. A full person/place/time/event description is not required.
- Short inputs such as `我夢到蛇` should receive a cautious initial reading instead of being blocked for lack of detail.
- A content-free lead such as `我做了怪夢` may ask for only one remembered image or feeling; it must not turn into a long intake questionnaire.
- The primary output should answer: `這個夢可能在反映什麼？` and `最近的心態可能有什麼變化？`
- Follow-up reflection questions and source details are optional and collapsed by default.

## Evidence rules

- Prefer the dreamer's own associations and actual remembered content over universal symbol lookup.
- Separate remembered dream content from proposed interpretation.
- Treat condensation, displacement, recent waking-life material, and any symbolic parallels as hypotheses rather than facts.
- Never claim that a dream proves a diagnosis, future event, supernatural message, hidden desire, trauma, or another person's intention.
- Do not present Freud's historical theory as modern clinical consensus.
- Retrieved passages may guide the interpretation, but Vela must not manufacture a quotation or say that Freud assigned a fixed meaning to a symbol unless the retrieved text actually supports that claim.

## Pipeline

Dream text -> structured extraction -> Freud full-book semantic retrieval -> Vela synthesis -> concise reading -> optional source/reflection details.

If full-book retrieval is unavailable:

Dream text -> structured extraction -> curated Freud fallback principles -> Vela synthesis -> concise reading with fallback disclosure.

## Source import and ingestion

Source metadata: `data/metadata/freud-interpretation-of-dreams-1913.json`

Raw public-domain source: `data/raw/public-domain/dream/freud-interpretation-of-dreams-1913.txt`

Import workflow: `.github/workflows/import-public-domain-freud.yml`

Ingestion command:

`npm run ingest:dream -- data/metadata/freud-interpretation-of-dreams-1913.json data/raw/public-domain/dream/freud-interpretation-of-dreams-1913.txt`

A manual GitHub Actions workflow is also provided at `.github/workflows/ingest-freud-dream-rag.yml`. It requires `OPENAI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` as GitHub Actions secrets.

## History and auth handoff

Dream history is private, account-scoped, protected by RLS, and follows the same 365-day retention policy as Tarot and Astrology. If an anonymous user signs in with Google from a completed Dream reading, the active reading must survive the OAuth redirect, reopen automatically, and then be saved to that account.
