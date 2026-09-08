export const DREAM_SOURCES = Object.freeze({
  "freud-interpretation-dreams-1913": Object.freeze({
    sourceId: "freud-interpretation-dreams-1913",
    author: "Sigmund Freud",
    title: "The Interpretation of Dreams",
    edition: "A. A. Brill translation, Macmillan, 1913",
    catalogUrl: "https://www.gutenberg.org/ebooks/66048",
    lens: "historical psychoanalytic theory",
  }),
  "ellis-world-of-dreams-1922": Object.freeze({
    sourceId: "ellis-world-of-dreams-1922",
    author: "Havelock Ellis",
    title: "The World of Dreams",
    edition: "Houghton Mifflin, 1922",
    catalogUrl: "https://www.gutenberg.org/ebooks/59214",
    lens: "historical psychological observation",
  }),
});

export const DREAM_EVIDENCE = Object.freeze([
  Object.freeze({
    id: "freud-manifest-latent",
    sourceId: "freud-interpretation-dreams-1913",
    location: "Ch. II–VI: dream interpretation and dream-work",
    tags: ["general", "symbolism", "conflict", "recurring"],
    principle: "Freud distinguishes the remembered dream from the thoughts and associations used to interpret it; the remembered scene should not be treated as a literal one-to-one code.",
    usageNote: "Historical theory. Use to invite associations, never to assert a hidden diagnosis or a single true meaning.",
  }),
  Object.freeze({
    id: "freud-dream-work",
    sourceId: "freud-interpretation-dreams-1913",
    location: "Ch. VI: The Dream-Work",
    tags: ["general", "fragmented", "strange", "symbolism", "transition"],
    principle: "Freud describes dream-work as transforming and rearranging material, including condensation and shifts of emphasis, which can make a dream feel compressed, indirect, or oddly assembled.",
    usageNote: "Historical psychoanalytic mechanism; do not present as verified neuroscience.",
  }),
  Object.freeze({
    id: "ellis-emotion",
    sourceId: "ellis-world-of-dreams-1922",
    location: "Ch. V: Emotion in Dreams",
    tags: ["general", "fear", "anxiety", "sadness", "grief", "anger", "joy", "nightmare", "confusion"],
    principle: "Ellis treats emotion as a central organizing feature of dream experience and notes that dream imagery may develop around an affective tone even when its waking source is unclear.",
    usageNote: "Use the felt emotion as an interpretive anchor before assigning meaning to individual objects.",
  }),
  Object.freeze({
    id: "ellis-symbolism",
    sourceId: "ellis-world-of-dreams-1922",
    location: "Ch. VII: Symbolism in Dreams",
    tags: ["general", "symbolism", "object", "place", "animal", "water", "house", "vehicle", "door", "path", "darkness", "light"],
    principle: "Ellis argues that dreams readily turn subjective feelings and associations into concrete images, while also warning that fixed and constant symbol meanings deserve skepticism.",
    usageNote: "Treat symbols as prompts for the dreamer's own associations, not universal dictionary definitions.",
  }),
  Object.freeze({
    id: "ellis-flying-falling",
    sourceId: "ellis-world-of-dreams-1922",
    location: "Ch. VI: Aviation in Dreams",
    tags: ["flying", "falling", "loss-control"],
    principle: "Ellis discusses flying and falling as vivid recurring dream forms and considers bodily sensation and dream construction among possible contributors rather than a single fixed symbolic meaning.",
    usageNote: "Keep multiple explanations open; do not reduce falling/flying to one emotional verdict.",
  }),
  Object.freeze({
    id: "ellis-dead",
    sourceId: "ellis-world-of-dreams-1922",
    location: "Ch. VIII: Dreams of the Dead",
    tags: ["death", "dead", "grief", "person"],
    principle: "Ellis records dreams of deceased people as a recurring human form that can carry strong emotion and sometimes consolation, without requiring a supernatural explanation.",
    usageNote: "Do not claim contact with the dead. Allow grief, memory, attachment and unfinished feeling as possibilities.",
  }),
  Object.freeze({
    id: "ellis-memory",
    sourceId: "ellis-world-of-dreams-1922",
    location: "Ch. IX: Memory in Dreams",
    tags: ["memory", "past", "school", "childhood", "recurring", "person"],
    principle: "Ellis notes that dream memory can loosen ordinary waking associations, allowing old or seemingly forgotten material to reappear in unusual combinations.",
    usageNote: "A resurfacing image can be explored as memory/association; never claim it proves a recovered historical fact.",
  }),
]);

export function getDreamEvidenceItem(id) {
  return DREAM_EVIDENCE.find((item) => item.id === id) || null;
}
