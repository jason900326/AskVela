export const SOURCE_CURATION_VERSION = "historical-tarot-v1";

const REPLACEMENT_RULES = [
  {
    id: "country-gentleman-label",
    pattern: /\bMan living in the country,?\s*Country Gentleman,?/giu,
    replacement: "rural or established social context,",
  },
  {
    id: "lady-of-manor-label",
    pattern: /\bWoman living in the country,?\s*Lady of the Manor,?/giu,
    replacement: "rural or established social context,",
  },
  {
    id: "good-severe-man-label",
    pattern: /\bA naturally good but severe man\b,?/giu,
    replacement: "constructive but strict counsel,",
  },
  {
    id: "virtuous-woman-label",
    pattern: /\bA good (?:a|and)?\s*virtuous Woman,?\s*but strict and economical\b,?/giu,
    replacement: "principled restraint, strictness, and economy,",
  },
  {
    id: "good-stranger-label",
    pattern: /\bA Good Stranger\b,?/giu,
    replacement: "a helpful new influence,",
  },
  {
    id: "shifty-man-label",
    pattern: /\bA Man of good position,?\s*but shifty in (?:his|their) Dealings\b,?/giu,
    replacement: "status or authority alongside inconsistent or unreliable dealings,",
  },
  {
    id: "intermeddling-woman-label",
    pattern: /\bA Woman in good position,?\s*but intermeddling,?\s*and to be distrusted\b[;,]?/giu,
    replacement: "influence mixed with overinvolvement or reasons for caution;",
  },
  {
    id: "flatterer-label",
    pattern: /\bA Flatterer\b,?/giu,
    replacement: "flattery or insincere praise,",
  },
  {
    id: "lawyer-person-label",
    pattern: /\bA Lawyer,?\s*a Man of Law\b,?/giu,
    replacement: "legal authority or formal judgment,",
  },
  {
    id: "wicked-man-label",
    pattern: /\bA Wicked Man\b,?/giu,
    replacement: "hostility, harmful conduct, or an adversarial influence,",
  },
  {
    id: "bad-woman-label",
    pattern: /\bA Bad Woman,?\s*ill-tempered and bigoted\b,?/giu,
    replacement: "harsh conflict, rigid attitudes, or intolerance,",
  },
  {
    id: "soldier-person-label",
    pattern: /\bA Soldier,?\s*a man whose profession is arms\b,?/giu,
    replacement: "decisive action, readiness, or conflict,",
  },
  {
    id: "conceited-fool-label",
    pattern: /\bA conceited fool\b,?/giu,
    replacement: "overconfidence or poor judgment,",
  },
  {
    id: "spy-person-label",
    pattern: /\bA Spy\b,?/giu,
    replacement: "scrutiny, observation, or concealed attention,",
  },
  {
    id: "priest-person-label",
    pattern: /\bAn Ecclesiastic,?\s*a Priest\b,?/giu,
    replacement: "conscience or moral and spiritual authority,",
  },
  {
    id: "nun-person-label",
    pattern: /\bA Nun\b,?/giu,
    replacement: "withdrawal or renunciation,",
  },
  {
    id: "shady-character-label",
    pattern: /\bShady character\b/giu,
    replacement: "unclear motives or reasons for caution",
  },
  {
    id: "vicious-dangerous-man-label",
    pattern: /\bAn old and vicious Man,?\s*a Dangerous Man\b,?/giu,
    replacement: "danger, hostility, or harmful conduct,",
  },
  {
    id: "suspicious-woman-label",
    pattern: /\b(?:Certain Evil,?\s*)?a suspicious Woman,?\s*a Woman justly regarded with Suspicion\b,?/giu,
    replacement: "serious difficulty, grounds for caution, doubt, or mistrust,",
  },
  {
    id: "useful-man-label",
    pattern: /\bA useful Man\b,?/giu,
    replacement: "usefulness and reliability,",
  },
  {
    id: "unemployed-man-label",
    pattern: /\bA brave Man,?\s*but out of Employment,?\s*Idle,?\s*Unemployed,?\s*Negligent\b/giu,
    replacement: "unused capacity, inactivity, unemployment, or neglect",
  },
  {
    id: "complexion-person-label",
    pattern: /\b(?:A|An)\s+(?:fair|dark)\s+(?:Man|Woman|Youth|Girl)\b,?\s*/giu,
    replacement: "",
  },
  {
    id: "generic-dangerous-person-label",
    pattern: /\b(?:A|An)\s+(?:wicked|vicious|bad|dangerous)\s+(?:man|woman|person)\b,?/giu,
    replacement: "harmful, adversarial, or unsafe conduct,",
  },
  {
    id: "generic-distrust-label",
    pattern: /\bto be distrusted\b/giu,
    replacement: "reasons for caution",
  },
  {
    id: "generic-suspicion-label",
    pattern: /\bjustly regarded with suspicion\b/giu,
    replacement: "grounds for caution",
  },
];

const AUDIT_RULES = [
  ["identity-insult", /\b(?:wicked|vicious|bad|dangerous)\s+(?:man|woman|person)\b/iu],
  ["conceited-fool", /\bconceited\s+fool\b/iu],
  ["shady-character", /\bshady\s+character\b/iu],
  ["complexion-person-label", /\b(?:fair|dark)\s+(?:man|woman|youth|girl)\b/iu],
  ["direct-distrust-label", /\bto be distrusted\b/iu],
  ["direct-suspicion-label", /\bjustly regarded with suspicion\b/iu],
  ["suspicious-person-label", /\bsuspicious\s+(?:man|woman|person)\b/iu],
];

function cleanPunctuation(text) {
  return String(text)
    .replace(/\s+,/gu, ",")
    .replace(/,\s*,+/gu, ", ")
    .replace(/;\s*;/gu, ";")
    .replace(/^\s*[,;:.-]+\s*/u, "")
    .replace(/\s{2,}/gu, " ")
    .trim();
}

export function auditSourceMeaning(text) {
  const value = String(text || "");
  return AUDIT_RULES
    .filter(([, pattern]) => pattern.test(value))
    .map(([id]) => id);
}

export function curateSourceMeaning(text) {
  const original = String(text || "").trim();
  let content = original;
  const actions = [];

  for (const rule of REPLACEMENT_RULES) {
    const next = content.replace(rule.pattern, rule.replacement);
    if (next !== content) {
      actions.push(rule.id);
      content = next;
    }
  }

  content = cleanPunctuation(content);

  return {
    content,
    changed: content !== original,
    actions,
    remainingFindings: auditSourceMeaning(content),
    curationVersion: SOURCE_CURATION_VERSION,
  };
}

export function assertCuratedSourceMeaning(text, context = "source meaning") {
  const findings = auditSourceMeaning(text);
  if (findings.length) {
    throw new Error(`${context} still contains direct person-label findings: ${findings.join(", ")}`);
  }
}
