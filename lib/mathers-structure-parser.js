import { TAROT_CARDS, TAROT_CARD_BY_ID } from "./tarot-cards.js";
import { validateStructuredTarot } from "./waite-structure-parser.js";
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
    .filter((line) => !/^https?:\/\//iu.test(line))
    .filter((line) => !/^the tarot\s*$/iu.test(line))
    .join(" ")
    .replace(/\s+/gu, " ")
    .trim();
}

function removeHeading(rawEntry) {
  const withoutNumber = rawEntry.replace(/^\s*\d{1,2}\.\s*/u, "").trim();
  const dash = withoutNumber.match(/(?:--|—|–)\s*/u);
  if (dash?.index !== undefined) {
    return withoutNumber.slice(dash.index + dash[0].length).trim();
  }

  const sentenceBreak = withoutNumber.search(/\.\s+/u);
  if (sentenceBreak >= 0) {
    return withoutNumber.slice(sentenceBreak + 1).trim();
  }

  return withoutNumber;
}

function splitOrientations(rawMeaning) {
  const marker = /\bR\.\s*/iu.exec(rawMeaning);
  if (!marker) return { upright: rawMeaning.trim(), reversed: "" };
  return {
    upright: rawMeaning.slice(0, marker.index).trim(),
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
    const lookahead = lines.slice(candidate.index + 1, candidate.index + 30).join("\n");
    if (/^\s*1\.\s+The\s+(?:Juggler|Magician)\b/imu.test(lookahead)) {
      return candidate.index;
    }
  }

  return candidates[0]?.index ?? -1;
}

export function parseMathersStructure(text, bookMetadata) {
  const lines = String(text).replace(/\r\n?/gu, "\n").split("\n");
  const sectionStart = findMeaningsSection(lines);
  if (sectionStart < 0) throw new Error("Mathers parser could not find 'MEANINGS OF THE CARDS'.");

  const entries = [];
  const seen = new Set();
  for (let index = sectionStart + 1; index < lines.length; index += 1) {
    if (/^The following additional remarks/iu.test(lines[index].trim())) break;
    if (/^METHODS? OF DIVINATION/iu.test(lines[index].trim())) break;

    const match = lines[index].trim().match(/^(\d{1,2})\.\s+(.+)/u);
    if (!match) continue;
    const number = Number(match[1]);
    const cardId = NUMBER_TO_CARD_ID.get(number);
    if (!cardId || seen.has(cardId)) continue;
    seen.add(cardId);
    entries.push({ number, cardId, index });
    if (entries.length === 78) break;
  }

  if (entries.length !== 78) {
    throw new Error(`Mathers parser expected 78 numbered card meanings; found ${entries.length}.`);
  }

  const cards = new Map(TAROT_CARDS.map((card) => [card.card_id, {
    ...card,
    sections: [],
  }]));

  for (let entryIndex = 0; entryIndex < entries.length; entryIndex += 1) {
    const entry = entries[entryIndex];
    const nextStart = entries[entryIndex + 1]?.index
      ?? lines.findIndex((line, index) => index > entry.index
        && /^The following additional remarks/iu.test(line.trim()));
    const end = nextStart >= 0 ? nextStart : lines.length;
    const rawEntry = cleanLines(lines.slice(entry.index, end));
    const meaning = removeHeading(rawEntry);
    const split = splitOrientations(meaning);

    if (!split.upright || !split.reversed) {
      throw new Error(`Mathers parser could not split upright/reversed meaning for ${entry.cardId}.`);
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

  const errors = validateStructuredTarot(structured);
  if (errors.length) throw new Error(`Structured tarot validation failed:\n- ${errors.join("\n- ")}`);
  return structured;
}
