import test from "node:test";
import assert from "node:assert/strict";
import {
  assertCuratedSourceMeaning,
  auditSourceMeaning,
  curateSourceMeaning,
} from "../lib/source-curation.js";

test("curation removes direct moral labels while preserving the underlying risk concept", () => {
  const result = curateSourceMeaning(
    "A Wicked Man, Chagrin, Worry, Grief, Fear, Disturbance.",
  );

  assert.equal(result.changed, true);
  assert.match(result.content, /hostility|harmful conduct|adversarial/iu);
  assert.doesNotMatch(result.content, /Wicked Man/iu);
  assert.deepEqual(result.remainingFindings, []);
  assert.doesNotThrow(() => assertCuratedSourceMeaning(result.content));
});

test("curation converts direct distrust of a person into situational caution", () => {
  const result = curateSourceMeaning(
    "A Woman in good position, but intermeddling, and to be distrusted; Success, but with some attendant trouble.",
  );

  assert.match(result.content, /overinvolvement|reasons for caution/iu);
  assert.doesNotMatch(result.content, /woman|to be distrusted/iu);
  assert.deepEqual(auditSourceMeaning(result.content), []);
});

test("abstract difficult meanings are not erased just because they are negative", () => {
  const result = curateSourceMeaning("Treachery, Subterfuge, Duplicity, Bar.");

  assert.equal(result.changed, false);
  assert.equal(result.content, "Treachery, Subterfuge, Duplicity, Bar.");
  assert.deepEqual(result.remainingFindings, []);
});

test("outdated complexion person labels are removed", () => {
  const result = curateSourceMeaning("A dark Woman, a generous Woman, Liberality, Generosity.");

  assert.doesNotMatch(result.content, /dark Woman/iu);
  assert.deepEqual(result.remainingFindings, []);
});
