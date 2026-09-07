import { TAROT_CARDS, TAROT_CARD_BY_ID } from "./tarot-cards.js";
import { validateStructuredTarotSource } from "./structured-tarot-validation.js";
import {
  assertCuratedSourceMeaning,
  curateSourceMeaning,
  SOURCE_CURATION_VERSION,
} from "./source-curation.js";

const SUITS = ["wands", "cups", "swords", "pentacles"];
const RANKS = [
  "king", "queen", "knight", "page", "ten", "nine", "eight",
  "seven", "six", "five", "four", "three", "two", "ace",
];
const SOURCE_RANK_PATTERN = "(?:King|Queen|Knight|Knave|Page|Ten|Nine|Eight|Seven|Six|Five|Four|Three|Two|Deuce|Ace)";
const SOURCE_SUIT_PATTERN = "(?:Sceptres|Wands|Cups|Swords|Pentacles|Coins)";

const NUMBER_TO_CARD_ID = new Map();
for (const card of TAROT_CARDS.filter((item) => item.arcana === "major")) {
  NUMBER_TO_CARD_ID.set(Number(card.number_or_rank), card.card_id);
}

let minorNumber = 22;
for (const suit of SUITS) {
  for (const rank of RANKS) {
    NUMBER_TO_CARD_ID.set(minorNumber, `minor-${suit}-${rank}`);
    minorNumber += 1;
  }
}

function pageBefore(lines, index) {
  for (let cursor = index; cursor >= 0; cursor -= 1) {
    const line = lines[cursor].trim();
    const marker = line.match(/^--\s*(\d+)\s+of\s+\d+\s*--$/iu)
      || line.match(/^page\s+(\d+)$/iu);
    if (marker) return Number(marker[1]);
  }
  return null;
}

function cleanLines(lines) {
  return lines
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^--\s*\d+\s+of\s+\d+\s*--$/iu.test(line))
    .filter((line) => !/^page\s+\d+$/iu.test(line))
    .filter((line) => !/^\d+$/u.test(line))
    .filter((line) => !/^https?:\/\//iu.test(line))
    .filter((line) => !/^THE TAROT(?:\s*\(MACGREGOR MATHERS\))?\s*$/iu.test(line))
    .filter((line) => !/^MEANINGS OF THE CARDS\s*$/iu.test(line))
    .join(" ")
    .replace(/\s+/gu, " ")
    .trim();
}

function sourceEntryMatch(line) {
  const value = line.trim();
  const major = value.match(/^(\d{1,2})(?:\.\s*|\s+)Key\s+\d+\s*(?:--|—|–|-)\s*(.+)$/iu);
  if (major) return { number: Number(major[1]), kind: "major" };

  const minor = value.match(
    new RegExp(`^(\\d{1,2})(?:\\.\\s*|\\s+)${SOURCE_RANK_PATTERN}\\s+of\\s+${SOURCE_SUIT_PATTERN}\\b`, "iu"),
  );
  if (minor) return { number: Number(minor[1]), kind: "minor" };

  // Keep compatibility with older plain-text editions used by tests and local imports.
  const legacy = value.match(/^(\d{1,2})\.\s+(.+)/u);
  return legacy ? { number: Number(legacy[1]), kind: "legacy" } : null;
}

function removeHeading(rawEntry, kind) {
  if (kind === "major") {
    return rawEntry
      .replace(/^\s*\d{1,2}\s+Key\s+\d+\s*(?:--|—|–|-)\s*/iu, "")
      .trim();
  }
  if (kind === "minor") {
    return rawEntry
      .replace(
        new RegExp(`^\\s*\\d{1,2}\\s+${SOURCE_RANK_PATTERN}\\s+of\\s+${SOURCE_SUIT_PATTERN}\\s*`, "iu"),
        "",
      )
      .trim();
  }

  const withoutNumber = rawEntry.replace(/^\s*\d{1,2}\.\s*/u, "").trim();
  const dash = withoutNumber.match(/(?:--|—|–)\s*/u);
  if (dash?.index !== undefined) {
    return withoutNumber.slice(dash.index + dash[0].length).trim();
  }
  return withoutNumber;
}

function splitOrientations(rawMeaning) {
  const marker = /\b(?:Reversed\s+Meaning:\s*|R\.\s*)/iu.exec(rawMeaning);
  if (!marker) return { upright: rawMeaning.trim(), reversed: "" };
  return {
    upright: rawMeaning.slice(0, marker.index).replace(/[;,:\s]+$/u, "").trim(),
    reversed: rawMeaning.slice(marker.index + marker[0].length).trim(),
  };
}

function sourceLocation(lines, start, end, bookMetadata, chapter = "Meanings of the Cards") {
  const pageStart = pageBefore(lines, start);
  const pageEnd = pageBefore(lines, Math.max(start, end - 1));
  return {
    chapter,
    pdf_page_start: pageStart,
    pdf_page_end: pageEnd || pageStart,
    source_url: bookMetadata?.metadata?.source_url || null,
    line_start: start + 1,
    line_end: end,
  };
}

function makeMeaningSection(orientation, curated, location, origin = "primary_table") {
  return {
    section_type: "divinatory_meaning",
    orientation,
    content: curated.content,
    source_location: location,
    curation: {
      version: curated.curationVersion,
      changed: curated.changed,
      actions: curated.actions,
      origin,
    },
  };
}

function findMeaningsSection(lines) {
  const candidates = lines
    .map((line, index) => ({ line: line.trim(), index }))
    .filter(({ line }) => /^MEANINGS OF THE CARDS$/iu.test(line));

  for (const candidate of candidates) {
    const lookahead = lines.slice(candidate.index + 1, candidate.index + 35);
    const hasFirstCard = lookahead.some((line) => {
      const match = sourceEntryMatch(line);
      return match?.number === 1 && /\bJuggler\b|\bMagician\b/iu.test(line);
    });
    if (hasFirstCard) return candidate.index;
  }

  return -1;
}

function findFirstIndex(lines, fromIndex, patterns) {
  for (let index = fromIndex + 1; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (patterns.some((pattern) => pattern.test(line))) return index;
  }
  return lines.length;
}

function primaryMeaningsEnd(lines, sectionStart) {
  return findFirstIndex(lines, sectionStart, [
    /^The following additional remarks/iu,
    /^METHODS? OF DIVINATION$/iu,
  ]);
}

function methodsStart(lines, fromIndex) {
  return findFirstIndex(lines, fromIndex, [/^METHODS? OF DIVINATION$/iu]);
}

function collectEntries(lines, start, end, { unique = false } = {}) {
  const entries = [];
  const seen = new Set();
  for (let index = start + 1; index < end; index += 1) {
    const match = sourceEntryMatch(lines[index]);
    if (!match) continue;
    const cardId = NUMBER_TO_CARD_ID.get(match.number);
    if (!cardId) continue;
    if (unique && seen.has(cardId)) continue;
    seen.add(cardId);
    entries.push({ number: match.number, cardId, kind: match.kind, index });
    if (unique && entries.length === 78) break;
  }
  return entries;
}

function collectSupplementalMeanings(lines, start, end, bookMetadata) {
  const supplementalEntries = collectEntries(lines, start, end);
  const byNumber = new Map();

  for (let entryIndex = 0; entryIndex < supplementalEntries.length; entryIndex += 1) {
    const entry = supplementalEntries[entryIndex];
    const entryEnd = supplementalEntries[entryIndex + 1]?.index ?? end;
    const rawEntry = cleanLines(lines.slice(entry.index, entryEnd));
    const meaning = removeHeading(rawEntry, entry.kind);
    const split = splitOrientations(meaning);
    const location = sourceLocation(
      lines,
      entry.index,
      entryEnd,
      bookMetadata,
      "Meanings of the Cards — additional remarks",
    );

    const current = byNumber.get(entry.number) || {};
    if (split.upright) current.upright = { content: split.upright, location };
    if (split.reversed) current.reversed = { content: split.reversed, location };
    byNumber.set(entry.number, current);
  }

  return byNumber;
}

export function parseMathersStructure(text, bookMetadata) {
  const lines = String(text).replace(/\r\n?/gu, "\n").split("\n");
  const sectionStart = findMeaningsSection(lines);
  if (sectionStart < 0) {
    throw new Error("Mathers parser could not find the body 'MEANINGS OF THE CARDS' section.");
  }

  const sectionEnd = primaryMeaningsEnd(lines, sectionStart);
  const entries = collectEntries(lines, sectionStart, sectionEnd, { unique: true });
  if (entries.length !== 78) {
    const foundNumbers = entries.map((entry) => entry.number).sort((a, b) => a - b);
    throw new Error(
      `Mathers parser expected 78 numbered card meanings; found ${entries.length}. Source numbers: ${foundNumbers.join(", ")}`,
    );
  }

  const supplementalEnd = methodsStart(lines, sectionEnd);
  const supplemental = collectSupplementalMeanings(lines, sectionEnd, supplementalEnd, bookMetadata);

  const cards = new Map(TAROT_CARDS.map((card) => [card.card_id, {
    ...card,
    sections: [],
  }]));

  for (let entryIndex = 0; entryIndex < entries.length; entryIndex += 1) {
    const entry = entries[entryIndex];
    const end = entries[entryIndex + 1]?.index ?? sectionEnd;
    const rawEntry = cleanLines(lines.slice(entry.index, end));
    const meaning = removeHeading(rawEntry, entry.kind);
    const split = splitOrientations(meaning);
    const primaryLocation = sourceLocation(lines, entry.index, end, bookMetadata);
    const supplementalEntry = supplemental.get(entry.number) || {};

    const uprightSource = split.upright
      ? { content: split.upright, location: primaryLocation, origin: "primary_table" }
      : supplementalEntry.upright
        ? { ...supplementalEntry.upright, origin: "supplemental_remarks" }
        : null;
    const reversedSource = split.reversed
      ? { content: split.reversed, location: primaryLocation, origin: "primary_table" }
      : supplementalEntry.reversed
        ? { ...supplementalEntry.reversed, origin: "supplemental_remarks" }
        : null;

    if (!uprightSource || !reversedSource) {
      throw new Error(
        `Mathers parser could not resolve upright/reversed meaning for ${entry.cardId} (source number ${entry.number}).`,
      );
    }

    const upright = curateSourceMeaning(uprightSource.content);
    const reversed = curateSourceMeaning(reversedSource.content);
    assertCuratedSourceMeaning(upright.content, `${entry.cardId}/upright`);
    assertCuratedSourceMeaning(reversed.content, `${entry.cardId}/reversed`);

    cards.get(entry.cardId).sections.push(
      makeMeaningSection("upright", upright, uprightSource.location, uprightSource.origin),
      makeMeaningSection("reversed", reversed, reversedSource.location, reversedSource.origin),
    );
  }

  for (const card of cards.values()) {
    if (!TAROT_CARD_BY_ID.has(card.card_id)) {
      throw new Error(`Mathers parser produced unknown card id ${card.card_id}.`);
    }
  }

  const structured = {
    schema_version: 1,
    coverage_profile: "meanings_only",
    parser: "mathers-tarot-1888-v1",
    curation_version: SOURCE_CURATION_VERSION,
    generated_at: new Date().toISOString(),
    book: {
      slug: bookMetadata.slug,
      title: bookMetadata.title,
      author: bookMetadata.author || null,
      tarot_system: bookMetadata.tarot_system || null,
    },
    cards: [...cards.values()],
  };

  const errors = validateStructuredTarotSource(structured);
  if (errors.length) throw new Error(`Structured tarot validation failed:\n- ${errors.join("\n- ")}`);
  return structured;
}
