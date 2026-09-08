# AskVela Astrology Sources

This document records the source editions, provenance decisions, and interpretation boundaries for Phase 7.

## 1. Sepharial — *Astrology: How to Make and Read Your Own Horoscope*

Runtime/source-of-truth edition:

- Author: Sepharial
- Edition: Revised and Enlarged Edition
- Publication year: 1920
- Provider: Project Gutenberg
- eBook: #46963
- Source page: https://www.gutenberg.org/ebooks/46963
- Machine-readable text: https://www.gutenberg.org/files/46963/46963-0.txt
- Public-domain source: yes

User-upload verification:

- Uploaded filename: `How to Make and Read Your Own Horoscope.pdf`
- PDF pages: 77
- SHA-256: `1d0423a7d6142dc907be2f26d4a65294d8b697f3f272702a99ce20e4a2bd0d27`
- Title page and contents were visually verified.
- The PDF is an image/browser rendering of the Project Gutenberg eBook, so the canonical Gutenberg text is preferable for extraction and reproducibility.

Most relevant material for V1:

- Section I, Ch. I — planets and their attributed principles
- Section I, Ch. II — zodiac signs and classifications
- Section I, Ch. IV — astronomical aspects
- Section II, Ch. IV — planetary transits
- Section IV, Ch. II — effects of transits
- Section IV, Ch. III — summarising a horoscope

## 2. Alan Leo — *Astrology for All*

Runtime/source-of-truth edition:

- Author: Alan Leo
- Title: *Astrology for All: Individual and Personal Characteristics as Represented by the Sun and Moon*
- Edition: 4th edition, enlarged
- Publication year: 1910
- Provider: Biblioteca Particular Fernando Pessoa / Casa Fernando Pessoa
- Source page: https://bibliotecaparticular.casafernandopessoa.pt/1-91
- Rights marker: Public Domain Mark 1.0

User-upload cross-check:

- Uploaded filename: `Astrology for All.pdf`
- Uploaded edition: 6th edition, enlarged
- Uploaded publication year: 1931
- PDF pages reported by the file: 368
- SHA-256: `e3bed8cd553f8a6258bdd574a57956126f65adac7f59b49fab7730612e991158`
- Title page and contents were visually verified.
- The uploaded 1931 scan is **not** used as the public-repository rights source. AskVela attributes its corpus to the 1910 fourth edition, whose source institution explicitly marks it public domain.

Most relevant material for V1:

- Ch. III — the Sun and the Zodiac
- Chs. IV–XV — the twelve Sun signs
- Ch. XVI — nature/classification of the twelve signs
- Aspects
- Ch. XVII — the Moon and the Zodiac
- Ch. XVIII — Soli-Lunar combinations / polarities, used mainly to establish natal-method boundaries

## Why the raw uploaded binaries are not the runtime knowledge base

The runtime does not hand the entire PDF to the language model. It uses a small structured source corpus in `lib/astrology-source-corpus.js`, containing concise, attributable paraphrases and explicit scope labels. This gives deterministic evidence selection and makes it possible to reject invalid applications.

The exact uploaded PDFs are also large binary files. They are not committed by the current GitHub automation. If canonical public-domain raw files are later added manually, place them under `data/raw/public-domain/astrology/` and keep the metadata files aligned with the actual edition and checksum.

## Interpretation boundary: natal doctrine is not a current transit

This is the most important Phase 7 source-fidelity rule.

Alan Leo's Moon-in-sign chapters and Sun–Moon combinations primarily discuss **natal/birth configurations**. They may explain historical astrological doctrine, but they must not be converted into a claim such as:

> “The Moon is transiting Leo today, therefore you have a Leo Moon personality today.”

Likewise, a user's selected Sun sign is not an exact natal longitude. AskVela therefore does not create an “aspect to the center of the user's sign.” Without the actual natal degree, that would be false precision.

V1 instead combines:

1. the selected Sun sign as a broad natal baseline;
2. approximate **current** Sun and Moon longitudes calculated by code;
3. the actual current Sun–Moon angular relationship, when it falls within a supported aspect orb;
4. source principles whose scope matches the claim being made;
5. Vela's contextual synthesis in non-deterministic language.

## Historical-content curation

Both books contain claims that should not be presented as modern factual guidance. AskVela excludes or reframes historical material concerning:

- medical diagnosis or disease prediction;
- death or catastrophe prediction;
- mental-illness labels;
- physiognomy / bodily appearance as destiny;
- essentialist gender claims;
- racial, national, social-class, or occupation stereotypes;
- fixed moral judgments such as inherently good/evil persons;
- deterministic promises of wealth, marriage, loss, or other events.

Old `benefic/malefic` or `good/evil aspect` language may be retained only as historical context and is translated in Vela output into interaction terms such as *more harmonious*, *more fluid*, *more tense*, or *requiring adjustment*.

## Runtime evidence chain

Every formal Astrology result should be auditable as:

```text
book principle + source location
→ scope check (natal / transit / aspect / method)
→ actual computed sky signal
→ Vela contextual synthesis
→ human-readable source references in the result UI
```

If that chain cannot be established, the API should refuse the formal reading instead of filling the gap from model memory.
