import {
  ASTROLOGY_ASPECT_EVIDENCE,
  ASTROLOGY_BOOKS,
  ASTROLOGY_CORE_EVIDENCE,
  ASTROLOGY_SIGN_EVIDENCE,
  ASTROLOGY_SOURCE_GUARDRAILS,
} from "./astrology-source-corpus.js";

function sourceBook(sourceId) {
  return Object.values(ASTROLOGY_BOOKS).find((book) => book.id === sourceId) || null;
}

function evidenceItem(id, usedFor, entry, extra = {}) {
  const primary = sourceBook(entry.sourceId);
  const secondary = entry.secondarySourceId ? sourceBook(entry.secondarySourceId) : null;
  return {
    id,
    usedFor,
    scope: entry.scope || extra.scope || "source_principle",
    principle: entry.principle || extra.principle || "",
    location: entry.location,
    source: primary,
    secondarySource: secondary,
    ...extra,
  };
}

function uniqueAspectIds(skyContext) {
  return [...new Set((skyContext?.snapshots || [])
    .map((snapshot) => snapshot.sunMoonAspect?.id)
    .filter(Boolean))];
}

export function buildAstrologyEvidence({ signId, skyContext }) {
  const signEntry = ASTROLOGY_SIGN_EVIDENCE[signId];
  if (!signEntry) {
    return { sufficient: false, reason: "MISSING_SIGN_SOURCE", items: [], references: [] };
  }

  const items = [
    evidenceItem(`sign-${signId}`, "太陽星座的基準傾向", signEntry, {
      principle: `來源主題：${signEntry.themes.join("、")}。需要留意的失衡：${signEntry.tensions.join("；")}。`,
    }),
    evidenceItem("sun-principle", "太陽在解讀中的角色", ASTROLOGY_CORE_EVIDENCE.sun),
    evidenceItem("moon-principle", "當天月亮只能作為行運背景", ASTROLOGY_CORE_EVIDENCE.moon),
    evidenceItem("sign-system", "元素與類型的結構", ASTROLOGY_CORE_EVIDENCE.signSystem),
    evidenceItem("transit-method", "什麼才算有效的行運判讀", ASTROLOGY_CORE_EVIDENCE.transitMethod),
    evidenceItem("synthesis-method", "如何把多個訊號綜合而不是套模板", ASTROLOGY_CORE_EVIDENCE.synthesisMethod),
    evidenceItem("natal-boundary", "避免把本命 Moon / Sun–Moon 組合誤當今日行運", ASTROLOGY_CORE_EVIDENCE.natalBoundary),
  ];

  for (const aspectId of uniqueAspectIds(skyContext)) {
    const aspect = ASTROLOGY_ASPECT_EVIDENCE[aspectId];
    if (!aspect) continue;
    items.push(evidenceItem(`aspect-${aspectId}`, "當天太陽—月亮相位", aspect, {
      scope: "aspect_principle",
      principle: `${aspect.historicalFrame} Vela 的使用方式：${aspect.velaUse}`,
    }));
  }

  const referencesById = new Map();
  for (const item of items) {
    for (const book of [item.source, item.secondarySource].filter(Boolean)) {
      const key = `${book.id}|${item.location}`;
      if (!referencesById.has(key)) {
        referencesById.set(key, {
          sourceId: book.id,
          title: book.title,
          author: book.author,
          edition: book.edition,
          location: item.location,
          sourceUrl: book.sourceUrl,
        });
      }
    }
  }

  return {
    sufficient: items.length >= 7,
    items,
    references: [...referencesById.values()],
    guardrails: [...ASTROLOGY_SOURCE_GUARDRAILS],
  };
}

export function publicAstrologyEvidence(evidence) {
  return {
    references: evidence.references,
    methodNote: "Vela 先取用書中的可追溯原則，再對照當天實際計算出的太陽／月亮位置；書中本命論述與今日行運的情境化延伸會分開處理。",
  };
}
