import { DREAM_EVIDENCE, DREAM_SOURCES } from "./dream-source-corpus.js";

export function buildDreamEvidence(extracted) {
  const tags = new Set(extracted?.tags || ["general"]);
  const selected = DREAM_EVIDENCE.filter((item) => item.tags.some((tag) => tags.has(tag)));

  const mandatoryIds = ["freud-manifest-latent", "ellis-emotion", "ellis-symbolism"];
  for (const id of mandatoryIds) {
    const item = DREAM_EVIDENCE.find((candidate) => candidate.id === id);
    if (item && !selected.some((candidate) => candidate.id === id)) selected.push(item);
  }

  const unique = [...new Map(selected.map((item) => [item.id, item])).values()].slice(0, 7);
  const sourceIds = new Set(unique.map((item) => item.sourceId));
  return {
    sufficient: sourceIds.has("freud-interpretation-dreams-1913") && sourceIds.has("ellis-world-of-dreams-1922"),
    items: unique,
  };
}

export function publicDreamEvidence(evidence) {
  const references = (evidence?.items || []).map((item) => {
    const source = DREAM_SOURCES[item.sourceId];
    return {
      evidenceId: item.id,
      sourceId: item.sourceId,
      author: source.author,
      title: source.title,
      edition: source.edition,
      location: item.location,
      lens: source.lens,
      catalogUrl: source.catalogUrl,
    };
  });

  return {
    methodNote: "來源是歷史夢心理學理論與觀察；Vela 只把它們當反思框架，不把夢境當診斷、預言或固定符號字典。",
    references,
  };
}
