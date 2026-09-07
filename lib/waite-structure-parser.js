import { TAROT_CARDS, TAROT_CARD_BY_ID } from "./tarot-cards.js";

const MAJOR_SOURCE_ORDER = [
  "major-01-magician", "major-02-high-priestess", "major-03-empress",
  "major-04-emperor", "major-05-hierophant", "major-06-lovers",
  "major-07-chariot", "major-08-strength", "major-09-hermit",
  "major-10-wheel-of-fortune", "major-11-justice", "major-12-hanged-man",
  "major-13-death", "major-14-temperance", "major-15-devil",
  "major-16-tower", "major-17-star", "major-18-moon", "major-19-sun",
  "major-20-judgement", "major-00-fool", "major-21-world",
];

const RANK_SOURCE_ORDER = [
  "king", "queen", "knight", "page", "ten", "nine", "eight",
  "seven", "six", "five", "four", "three", "two", "ace",
];

const MINOR_SOURCE_ORDER = ["wands", "cups", "swords", "pentacles"]
  .flatMap((suit) => RANK_SOURCE_ORDER.map((rank) => `minor-${suit}-${rank}`));

const MAJOR_PAGE_HEADINGS = {
  "major-00-fool": "Zero. The Fool",
  "major-01-magician": "I. The Magician",
  "major-02-high-priestess": "II. The High Priestess",
  "major-03-empress": "III. The Empress",
  "major-04-emperor": "IV. The Emperor",
  "major-05-hierophant": "V. The Hierophant",
  "major-06-lovers": "VI. The Lovers",
  "major-07-chariot": "VII. The Chariot",
  "major-08-strength": "VIII. Strength, or Fortitude",
  "major-09-hermit": "IX. The Hermit",
  "major-10-wheel-of-fortune": "X. Wheel of Fortune",
  "major-11-justice": "XI. Justice",
  "major-12-hanged-man": "XII. The Hanged Man",
  "major-13-death": "XIII. Death",
  "major-14-temperance": "XIV. Temperance",
  "major-15-devil": "XV. The Devil",
  "major-16-tower": "XVI. The Tower",
  "major-17-star": "XVII. The Star",
  "major-18-moon": "XVIII. The Moon",
  "major-19-sun": "XIX. The Sun",
  "major-20-judgement": "XX. The Last Judgement",
  "major-21-world": "XXI. The World",
};

const MAJOR_DIVINATION_HEADINGS = {
  "major-00-fool": "ZERO. THE FOOL",
  "major-01-magician": "1. THE MAGICIAN",
  "major-02-high-priestess": "2. THE HIGH PRIESTESS",
  "major-03-empress": "3. THE EMPRESS",
  "major-04-emperor": "4. THE EMPEROR",
  "major-05-hierophant": "5. THE HIEROPHANT",
  "major-06-lovers": "6. THE LOVERS",
  "major-07-chariot": "7. THE CHARIOT",
  "major-08-strength": "8. FORTITUDE",
  "major-09-hermit": "9. THE HERMIT",
  "major-10-wheel-of-fortune": "10. WHEEL OF FORTUNE",
  "major-11-justice": "11. JUSTICE",
  "major-12-hanged-man": "12. THE HANGED MAN",
  "major-13-death": "13. DEATH",
  "major-14-temperance": "14. TEMPERANCE",
  "major-15-devil": "15. THE DEVIL",
  "major-16-tower": "16. THE TOWER",
  "major-17-star": "17. THE STAR",
  "major-18-moon": "18. THE MOON",
  "major-19-sun": "19. THE SUN",
  "major-20-judgement": "20. THE LAST JUDGMENT",
  "major-21-world": "21. THE WORLD",
};

const SECTION_NAMES = {
  majorSymbolism: "2.2 The Trumps Major and Inner Symbolism",
  minorArcana: "3.2 The Lesser Arcana",
  majorDivination: "3.3 The Greater Arcana and their Divinatory Meanings",
};

function nextNonEmptyLine(lines, index) {
  for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
    if (lines[cursor].trim()) return lines[cursor].trim();
  }
  return "";
}

function findCardPage(lines, heading, fromIndex = 0) {
  for (let index = fromIndex; index < lines.length; index += 1) {
    if (lines[index].trim() !== heading) continue;
    if (/^sacred-texts\b/iu.test(nextNonEmptyLine(lines, index))) return index;
  }
  return -1;
}

function pageBefore(lines, index) {
  for (let cursor = index; cursor >= 0; cursor -= 1) {
    const match = lines[cursor].match(/^--\s*(\d+)\s+of\s+\d+\s*--$/iu);
    if (match) return Number(match[1]);
  }
  return null;
}

function sourceUrl(lines) {
  const urls = lines
    .flatMap((line) => line.match(/https?:\/\/[^\s)]+/giu) || [])
    .map((url) => url.replace(/[.,;]+$/u, ""));
  return urls.find((url) => /sacred-texts\.com\/tarot\/pkt/iu.test(url)) || urls[0] || null;
}

function cleanSourceLines(lines, removableHeadings = []) {
  const removable = new Set(removableHeadings.map((heading) => heading.toLowerCase()));
  return lines
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^--\s*\d+\s+of\s+\d+\s*--$/iu.test(line))
    .filter((line) => !/^https?:\/\//iu.test(line))
    .filter((line) => !/^sacred-texts\b/iu.test(line))
    .filter((line) => !/^\d+\.\d+\s+/u.test(line))
    .filter((line) => !/^§\s*/u.test(line))
    .filter((line) => !/^(?:[IVXLCDM]+|0|ZERO)$/u.test(line))
    .filter((line) => !/^(?:WANDS|CUPS|SWORDS|PENTACLES)$/u.test(line))
    .filter((line) => !/^(?:Ace|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten|Page|Knight|Queen|King)$/u.test(line))
    .filter((line) => !removable.has(line.toLowerCase()))
    .join(" ")
    .replace(/\s+/gu, " ")
    .trim();
}

function location(lines, start, nextStart, chapter) {
  const pageStart = pageBefore(lines, start);
  const nextPage = pageBefore(lines, nextStart);
  return {
    chapter,
    pdf_page_start: pageStart,
    pdf_page_end: nextPage && pageStart ? Math.max(pageStart, nextPage - 1) : pageStart,
    source_url: sourceUrl(lines.slice(start, nextStart)),
    line_start: start + 1,
    line_end: nextStart,
  };
}

function splitOrientationText(text, uprightMarker = /Div[ai]natory Meanings:/u) {
  const markerMatch = typeof uprightMarker === "string"
    ? { index: text.indexOf(uprightMarker), 0: uprightMarker }
    : uprightMarker.exec(text);
  const uprightIndex = markerMatch?.index ?? -1;
  const markerLength = markerMatch?.[0]?.length ?? 0;
  const reversedIndex = text.indexOf("Reversed:", Math.max(0, uprightIndex));
  return {
    shared: uprightIndex >= 0 ? text.slice(0, uprightIndex).trim() : text.trim(),
    upright: uprightIndex >= 0
      ? text.slice(uprightIndex + markerLength, reversedIndex >= 0 ? reversedIndex : undefined).trim()
      : "",
    reversed: reversedIndex >= 0 ? text.slice(reversedIndex + "Reversed:".length).trim() : "",
  };
}

function makeSection(sectionType, orientation, content, sourceLocation) {
  return {
    section_type: sectionType,
    orientation,
    content,
    source_location: sourceLocation,
  };
}

function parseMajorSymbolism(lines) {
  const starts = MAJOR_SOURCE_ORDER.map((cardId) => ({
    cardId,
    index: findCardPage(lines, MAJOR_PAGE_HEADINGS[cardId]),
  }));

  return starts.map((entry, index) => {
    if (entry.index < 0) throw new Error(`Missing Major Arcana page: ${entry.cardId}`);
    const nextStart = starts[index + 1]?.index ?? lines.findIndex(
      (line, lineIndex) => lineIndex > entry.index && /^3\.1\s+/u.test(line.trim()),
    );
    const card = TAROT_CARD_BY_ID.get(entry.cardId);
    const text = cleanSourceLines(lines.slice(entry.index, nextStart), [
      MAJOR_PAGE_HEADINGS[entry.cardId], card.name_en,
    ]);

    return {
      cardId: entry.cardId,
      section: makeSection(
        "description_symbolism",
        null,
        text,
        location(lines, entry.index, nextStart, SECTION_NAMES.majorSymbolism),
      ),
    };
  });
}

function findMajorDivinationEntry(lines, cardId, fromIndex = 0) {
  const heading = MAJOR_DIVINATION_HEADINGS[cardId];
  for (let index = fromIndex; index < lines.length; index += 1) {
    if (lines[index].trim().startsWith(`${heading}.`)) return index;
  }
  return -1;
}

function parseMajorDivination(lines) {
  const starts = MAJOR_SOURCE_ORDER.map((cardId) => ({
    cardId,
    index: findMajorDivinationEntry(lines, cardId, 0),
  }));

  return starts.map((entry, index) => {
    if (entry.index < 0) throw new Error(`Missing Major Arcana divination entry: ${entry.cardId}`);
    const nextStart = starts[index + 1]?.index ?? lines.findIndex(
      (line, lineIndex) => lineIndex > entry.index && /^It will be seen that/u.test(line.trim()),
    );
    const heading = MAJOR_DIVINATION_HEADINGS[entry.cardId];
    const raw = cleanSourceLines(lines.slice(entry.index, nextStart));
    const withoutHeading = raw.replace(
      new RegExp(`^${heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\.\\s*--?\\s*`, "u"),
      "",
    );
    const { upright, reversed } = splitOrientationText(
      `Divinatory Meanings: ${withoutHeading}`,
    );
    const sourceLocation = location(
      lines,
      entry.index,
      nextStart,
      SECTION_NAMES.majorDivination,
    );

    return {
      cardId: entry.cardId,
      sections: [
        makeSection("divinatory_meaning", "upright", upright, sourceLocation),
        makeSection("divinatory_meaning", "reversed", reversed, sourceLocation),
      ],
    };
  });
}

function parseMinorArcana(lines) {
  const starts = MINOR_SOURCE_ORDER.map((cardId) => ({
    cardId,
    index: findCardPage(lines, TAROT_CARD_BY_ID.get(cardId).name_en),
  }));

  return starts.map((entry, index) => {
    if (entry.index < 0) throw new Error(`Missing Minor Arcana page: ${entry.cardId}`);
    const nextStart = starts[index + 1]?.index ?? lines.findIndex(
      (line, lineIndex) => lineIndex > entry.index && /^3\.3\s+/u.test(line.trim()),
    );
    const card = TAROT_CARD_BY_ID.get(entry.cardId);
    const text = cleanSourceLines(lines.slice(entry.index, nextStart), [card.name_en]);
    const parsed = splitOrientationText(text);
    const sourceLocation = location(
      lines,
      entry.index,
      nextStart,
      SECTION_NAMES.minorArcana,
    );

    const sections = [makeSection(
      "description_symbolism", null, parsed.shared, sourceLocation,
    )];
    if (parsed.upright) sections.push(makeSection(
      "divinatory_meaning", "upright", parsed.upright, sourceLocation,
    ));
    if (parsed.reversed) sections.push(makeSection(
      "divinatory_meaning", "reversed", parsed.reversed, sourceLocation,
    ));
    return { cardId: entry.cardId, sections };
  });
}

function parseMinorAdditionalMeanings(lines) {
  const sectionStart = findCardPage(lines, "3.4 Some Additional Meanings of the Lesser Arcana");
  const sectionEnd = findCardPage(lines, "3.5 The Recurrence of Cards in Dealing", sectionStart + 1);
  if (sectionStart < 0 || sectionEnd < 0) {
    throw new Error("Missing section 3.4 additional Minor Arcana meanings.");
  }

  const results = [];
  const suitLabels = { wands: "WANDS", cups: "CUPS", swords: "SWORDS", pentacles: "PENTACLES" };
  for (const suit of ["wands", "cups", "swords", "pentacles"]) {
    const suitStart = lines.findIndex(
      (line, index) => index >= sectionStart
        && index < sectionEnd
        && new RegExp(`^${suitLabels[suit]}\\.\\s+King\\.`, "iu").test(line.trim()),
    );
    const nextSuit = ["wands", "cups", "swords", "pentacles"]
      .slice(["wands", "cups", "swords", "pentacles"].indexOf(suit) + 1)
      .map((next) => lines.findIndex(
        (line, index) => index > suitStart
          && index < sectionEnd
          && new RegExp(`^${suitLabels[next]}\\.\\s+King\\.`, "iu").test(line.trim()),
      ))
      .find((index) => index >= 0) ?? sectionEnd;

    if (suitStart < 0) throw new Error(`Missing additional meanings for ${suit}.`);

    const rankStarts = RANK_SOURCE_ORDER.map((rank, rankIndex) => {
      const label = rank[0].toUpperCase() + rank.slice(1);
      const prefix = rankIndex === 0 ? `${suitLabels[suit]}. ${label}` : label;
      return {
        cardId: `minor-${suit}-${rank}`,
        label,
        prefix,
        index: lines.findIndex(
          (line, index) => index >= suitStart
            && index < nextSuit
            && new RegExp(`^${prefix}\\.`, "iu").test(line.trim()),
        ),
      };
    });

    for (let index = 0; index < rankStarts.length; index += 1) {
      const entry = rankStarts[index];
      if (entry.index < 0) throw new Error(`Missing additional meaning: ${entry.cardId}`);
      const nextStart = rankStarts[index + 1]?.index ?? nextSuit;
      const raw = cleanSourceLines(lines.slice(entry.index, nextStart));
      const withoutHeading = raw.replace(
        new RegExp(`^${entry.prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\.\\s*--?\\s*`, "iu"),
        "",
      );
      const reversedIndex = withoutHeading.indexOf("Reversed:");
      const upright = withoutHeading
        .slice(0, reversedIndex >= 0 ? reversedIndex : undefined)
        .trim();
      const reversed = reversedIndex >= 0
        ? withoutHeading.slice(reversedIndex + "Reversed:".length).trim()
        : "";
      const sourceLocation = location(
        lines,
        entry.index,
        nextStart,
        "3.4 Some Additional Meanings of the Lesser Arcana",
      );
      const sections = [];
      if (upright) sections.push(makeSection(
        "additional_divinatory_meaning", "upright", upright, sourceLocation,
      ));
      if (reversed) sections.push(makeSection(
        "additional_divinatory_meaning", "reversed", reversed, sourceLocation,
      ));
      results.push({ cardId: entry.cardId, sections });
    }
  }

  return results;
}

export function validateStructuredTarot(structured) {
  const errors = [];
  if (structured?.schema_version !== 1) errors.push("Unsupported or missing schema_version.");
  if (!Array.isArray(structured?.cards)) return [...errors, "cards must be an array."];
  if (structured.cards.length !== 78) errors.push(`Expected 78 cards; found ${structured.cards.length}.`);

  const ids = new Set();
  for (const card of structured.cards) {
    if (!TAROT_CARD_BY_ID.has(card.card_id)) errors.push(`Unknown card_id: ${card.card_id}.`);
    if (ids.has(card.card_id)) errors.push(`Duplicate card_id: ${card.card_id}.`);
    ids.add(card.card_id);

    const shared = card.sections?.filter((section) => section.orientation === null) || [];
    const upright = card.sections?.filter((section) => section.orientation === "upright") || [];
    const reversed = card.sections?.filter((section) => section.orientation === "reversed") || [];
    if (!shared.some((section) => section.content?.length >= 20)) {
      errors.push(`${card.card_id} has no source description/symbolism.`);
    }
    if (!upright.some((section) => section.content?.length >= 3)) {
      errors.push(`${card.card_id} has no upright source meaning.`);
    }
    if (!reversed.some((section) => section.content?.length >= 3)) {
      errors.push(`${card.card_id} has no reversed source meaning.`);
    }
    for (const section of card.sections || []) {
      if (!section.source_location?.chapter || !section.source_location?.pdf_page_start) {
        errors.push(`${card.card_id}/${section.section_type} has incomplete source location.`);
      }
    }
  }
  return errors;
}

export function parseWaiteStructure(text, bookMetadata) {
  const lines = String(text).replace(/\r\n?/gu, "\n").split("\n");
  const cards = new Map(TAROT_CARDS.map((card) => [card.card_id, {
    ...card,
    sections: [],
  }]));

  for (const { cardId, section } of parseMajorSymbolism(lines)) {
    cards.get(cardId).sections.push(section);
  }
  for (const { cardId, sections } of parseMajorDivination(lines)) {
    cards.get(cardId).sections.push(...sections);
  }
  for (const { cardId, sections } of parseMinorArcana(lines)) {
    cards.get(cardId).sections.push(...sections);
  }
  for (const { cardId, sections } of parseMinorAdditionalMeanings(lines)) {
    cards.get(cardId).sections.push(...sections);
  }

  const structured = {
    schema_version: 1,
    parser: "waite-pictorial-key-v1",
    generated_at: new Date().toISOString(),
    book: {
      slug: bookMetadata.slug,
      title: bookMetadata.title,
      author: bookMetadata.author || null,
      tarot_system: bookMetadata.tarot_system || null,
    },
    cards: [...cards.values()],
  };

  const errors = validateStructuredTarot(structured);
  if (errors.length) throw new Error(`Structured tarot validation failed:\n- ${errors.join("\n- ")}`);
  return structured;
}
