export const V1_TAROT_SOURCE_BOOK_SLUGS = [
  "the-pictorial-key-to-the-tarot",
  "the-tarot-macgregor-mathers-1888",
];

const SOURCE_TARGETS = [
  {
    id: "waite",
    label: "Arthur Edward Waite",
    bookSlug: "the-pictorial-key-to-the-tarot",
    patterns: [
      /\bwaite\b/iu,
      /\barth(?:ur)?\s+edward\s+waite\b/iu,
      /偉特/iu,
      /韋特/iu,
    ],
  },
  {
    id: "mathers",
    label: "S. L. MacGregor Mathers",
    bookSlug: "the-tarot-macgregor-mathers-1888",
    patterns: [
      /\bmathers\b/iu,
      /\bmacgregor\s+mathers\b/iu,
      /馬瑟斯/iu,
      /馬瑟士/iu,
    ],
  },
];

export function identifyRequestedTarotSources(question) {
  const text = String(question || "");
  const matched = SOURCE_TARGETS.filter((source) => source.patterns.some((pattern) => pattern.test(text)));

  return {
    sourceIds: matched.map((source) => source.id),
    sourceLabels: matched.map((source) => source.label),
    bookSlugs: matched.map((source) => source.bookSlug),
    explicitlyTargeted: matched.length > 0,
  };
}
