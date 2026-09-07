import { TAROT_CARD_BY_ID } from "./tarot-cards.js";

const COVERAGE_PROFILES = new Set(["full_reference", "meanings_only"]);

function hasTraceableLocation(section) {
  const location = section?.source_location;
  if (!location?.chapter) return false;
  return Boolean(location.pdf_page_start || location.line_start);
}

export function validateStructuredTarotSource(structured) {
  const errors = [];
  if (structured?.schema_version !== 1) errors.push("Unsupported or missing schema_version.");
  if (!Array.isArray(structured?.cards)) return [...errors, "cards must be an array."];
  if (structured.cards.length !== 78) errors.push(`Expected 78 cards; found ${structured.cards.length}.`);

  const coverageProfile = structured.coverage_profile || "full_reference";
  if (!COVERAGE_PROFILES.has(coverageProfile)) {
    errors.push(`Unsupported coverage_profile: ${coverageProfile}.`);
  }

  const ids = new Set();
  for (const card of structured.cards) {
    if (!TAROT_CARD_BY_ID.has(card.card_id)) errors.push(`Unknown card_id: ${card.card_id}.`);
    if (ids.has(card.card_id)) errors.push(`Duplicate card_id: ${card.card_id}.`);
    ids.add(card.card_id);

    const sections = Array.isArray(card.sections) ? card.sections : [];
    const shared = sections.filter((section) => section.orientation === null);
    const upright = sections.filter((section) => section.orientation === "upright");
    const reversed = sections.filter((section) => section.orientation === "reversed");

    if (coverageProfile === "full_reference"
      && !shared.some((section) => section.content?.length >= 20)) {
      errors.push(`${card.card_id} has no source description/symbolism.`);
    }
    if (!upright.some((section) => section.content?.length >= 3)) {
      errors.push(`${card.card_id} has no upright source meaning.`);
    }
    if (!reversed.some((section) => section.content?.length >= 3)) {
      errors.push(`${card.card_id} has no reversed source meaning.`);
    }

    for (const section of sections) {
      if (!section.section_type) errors.push(`${card.card_id} has a section without section_type.`);
      if (!section.content?.trim()) errors.push(`${card.card_id}/${section.section_type || "unknown"} is empty.`);
      if (!hasTraceableLocation(section)) {
        errors.push(`${card.card_id}/${section.section_type || "unknown"} has incomplete source location.`);
      }
    }
  }

  return errors;
}
