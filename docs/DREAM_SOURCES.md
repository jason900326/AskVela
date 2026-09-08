# Dream source provenance

## Runtime sources

### Sigmund Freud — *The Interpretation of Dreams*

- Author: Sigmund Freud (1856–1939)
- Translator: A. A. Brill
- Edition used for provenance: authorised English translation, third edition, Macmillan, New York, 1913
- Project Gutenberg ebook: #66048
- Catalog: https://www.gutenberg.org/ebooks/66048
- Public-domain status on Project Gutenberg: public domain in the USA
- Runtime use: historical psychoanalytic method only — manifest/latent distinction, dream-work, association, and caution that remembered dream content is transformed rather than a literal code.

AskVela does **not** present Freud's claims as modern diagnosis or scientific certainty.

### Havelock Ellis — *The World of Dreams*

- Author: Havelock Ellis (1859–1939)
- Edition: Houghton Mifflin, Boston and New York, 1922
- Project Gutenberg ebook: #59214
- Catalog: https://www.gutenberg.org/ebooks/59214
- Public-domain status on Project Gutenberg: public domain in the USA
- Runtime use: historical observations on emotion in dreams, symbolism, memory, flying/falling dreams, and dreams of the dead.

AskVela does **not** preserve outdated medical conclusions as present-day clinical claims.

## Curation rules

The runtime corpus contains concise paraphrases with chapter/section locations, not a copied dream dictionary.

Excluded from authoritative output:

- prophecy / fortune-telling claims;
- fixed universal symbol equations;
- diagnosis of mental illness from dream content;
- claims that a dream proves trauma, abuse, repressed memory, sexuality, or intent;
- historical race/gender/class/moral determinism;
- medical advice inferred from dream imagery.

## Evidence model

Each evidence item has:

- `id`
- `sourceId`
- `location`
- `tags`
- `principle`
- `usageNote`

Dream extraction selects relevant evidence deterministically. The model receives only those curated principles and must state interpretation as a possibility, not a fact.
