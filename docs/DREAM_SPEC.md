# AskVela Dream Interpretation — Phase 8 Contract

Dream interpretation is a reflective reading, not diagnosis, therapy, prediction, or a fixed symbol dictionary.

## Current source status

The current runtime does **not** query a user-uploaded Dream PDF and it does **not** run full-book RAG on every reading yet.

Instead, Phase 8 uses a small, manually curated principle corpus with explicit provenance to the public-domain 1913 English translation of Sigmund Freud's *The Interpretation of Dreams* (A. A. Brill translation, Macmillan; Project Gutenberg 66048).

C. G. Jung's *Psychology of the Unconscious* (Hinkle translation, 1916; Project Gutenberg 65903) remains registered as a possible historical secondary framework, but is no longer auto-selected by the default Dream flow.

This distinction matters: the current Dream system is **source-referenced through curated principles**, not yet **full-book retrieval grounded**. Before production-quality source claims, Freud's full text should be ingested into the same retrieval pipeline used by Tarot so individual readings can cite retrieved passages/chunks rather than only curated principles.

## Product direction

- Freud is the default historical framework.
- A user can start with one remembered image, object, action, or feeling. A full person/place/time/event description is not required.
- Short inputs such as `我夢到蛇` should receive a cautious initial reading instead of being blocked for lack of detail.
- A content-free lead such as `我做了怪夢` may ask for only one remembered image or feeling; it must not turn into a long intake questionnaire.
- The primary output should answer: `這個夢可能在反映什麼？` and `最近的心態可能有什麼變化？`
- Follow-up reflection questions and source links are optional details, collapsed by default.

## Evidence rules

- Prefer the dreamer's own associations and actual remembered content over universal symbol lookup.
- Separate remembered dream content from proposed interpretation.
- Treat condensation, displacement, recent waking-life material, and any symbolic parallels as hypotheses rather than facts.
- Never claim that a dream proves a diagnosis, future event, supernatural message, hidden desire, trauma, or another person's intention.
- Do not present Freud's historical theory as modern clinical consensus.

## Pipeline

Dream text -> structured extraction -> deterministic Freud-first principle selection -> Vela synthesis -> concise reading -> optional source/reflection details.

## History and auth handoff

Dream history is private, account-scoped, protected by RLS, and follows the same 365-day retention policy as Tarot and Astrology. If an anonymous user signs in with Google from a completed Dream reading, the active reading must survive the OAuth redirect, reopen automatically, and then be saved to that account.
