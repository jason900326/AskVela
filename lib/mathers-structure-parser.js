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
const SOURCE_RANK_PATTERN = "(?:King|Queen|Knight|Knave|Page|Ten|Nine|Eight|Seven|Six|Five|Four|Three|Two|Ace)";
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

function sourceLocation(lines, start, end, bookMetadata) {
  const pageStart = pageBefore(lines, start);
  const pageEnd = pageBefore(lines, Math.max(start, end - 1));
  return {
    chapter: "Meanings of the Cards",
    pdf_page_start: pageStart,
    pdf_page_end: pageEnd || pageStart,
    source_url: bookMetadata?.metadata?.source_url || null,
    line_start: start + 1,
    line_end: end,
  };
}

function makeMeaningSection(orientation, curated, location) {
  return {
    section_type: "divinatory_meaning",
    orientation,
    content: curated.content,
    source_location: location,
    curation: {
      version: curated.curationVersion,
      changed: curated.changed,
      actions: curated.actions,
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

function nextSectionBoundary(lines, fromIndex) {
  const candidates = lines
    .map((line, index) => ({ line: line.trim(), index }))
    .filter(({ index }) => index > fromIndex)
    .filter(({ line }) => /^The following additional remarks/iu.test(line)
      || /^METHODS? OF DIVINATION$/iu.test(line));
  return candidates[0]?.index ?? lines.length;
}

export function parseMathersStructure(text, bookMetadata) {
  const lines = String(text).replace(/\r\n?/gu, "\n").split("\n");
  const sectionStart = findMeaningsSection(lines);
  if (sectionStart < 0) {
    throw new Error("Mathers parser could not find the body 'MEANINGS OF THE CARDS' section.");
  }

  const sectionEnd = nextSectionBoundary(lines, sectionStart);
  const entries = [];
  const seen = new Set();
  for (let index = sectionStart + 1; index < sectionEnd; index += 1) {
    const match = sourceEntryMatch(lines[index]);
    if (!match) continue;
    const cardId = NUMBER_TO_CARD_ID.get(match.number);
    if (!cardId || seen.has(cardId)) continue;
    seen.add(cardId);
    entries.push({ number: match.number, cardId, kind: match.kind, index });
    if (entries.length === 78) break;
  }

  if (entries.length !== 78) {
    const foundNumbers = entries.map((entry) => entry.number).sort((a, b) => a - b);
    throw new Error(
      `Mathers parser expected 78 numbered card meanings; found ${entries.length}. Source numbers: ${foundNumbers.join(", ")}`,
    );
  }

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

    if (!split.upright || !split.reversed) {
      throw new Error(
        `Mathers parser could not split upright/reversed meaning for ${entry.cardId} (source number ${entry.number}).`,
      );
    }

    const upright = curateSourceMeaning(split.upright);
    const reversed = curateSourceMeaning(split.reversed);
    assertCuratedSourceMeaning(upright.content, `${entry.cardId}/upright`);
    assertCuratedSourceMeaning(reversed.content, `${entry.cardId}/reversed`);

    const location = sourceLocation(lines, entry.index, end, bookMetadata);
    cards.get(entry.cardId).sections.push(
      makeMeaningSection("upright", upright, location),
      makeMeaningSection("reversed", reversed, location),
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
