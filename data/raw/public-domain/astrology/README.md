# Astrology public-domain raw sources

Runtime provenance is documented in `../../../metadata/` and `../../../../docs/ASTROLOGY_SOURCES.md`.

Canonical source targets:

- `sepharial-astrology-how-to-make-and-read-1920.*` — Project Gutenberg #46963.
- `alan-leo-astrology-for-all-1910.*` — 4th enlarged edition, Casa Fernando Pessoa, Public Domain Mark 1.0.

The current GitHub automation does not copy the user's large binary PDF uploads into this directory. Do not substitute the user's 1931 Alan Leo sixth-edition scan for the 1910 rights/source-of-truth edition without updating provenance and reviewing repository rights.

The deployed Phase 7 runtime does not require raw PDFs at request time: it uses the reviewed structured source corpus in `lib/astrology-source-corpus.js` and deterministic evidence selection in `lib/astrology-evidence.js`.
