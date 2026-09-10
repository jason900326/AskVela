import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const quickPath = new URL("../components/FreeQuickTarot.js", import.meta.url);
const stabilityCssPath = new URL("../app/phase12a-mobile-stability.css", import.meta.url);

test("Free Tarot requires explicit confirmation before draw begins", async () => {
  const quick = await readFile(quickPath, "utf8");

  assert.match(quick, /const \[pendingIndex, setPendingIndex\]/u);
  assert.match(quick, /onClick=\{\(\) => selectCard\(index\)\}/u);
  assert.match(quick, /確定選這張嗎？/u);
  assert.match(quick, />換一張</u);
  assert.match(quick, />就是這張</u);
  assert.match(quick, /async function confirmCardSelection\(\)[\s\S]*await chooseCard\(index\)/u);
});

test("Free question entry is visually separated from the Vela landing artwork", async () => {
  const css = await readFile(stabilityCssPath, "utf8");

  assert.match(css, /\.phase12TarotHome\.entry-quick \.velaHomeStageLayout\s*\{[^}]*opacity:\s*0\s*!important/isu);
  assert.match(css, /visibility:\s*hidden\s*!important/u);
  assert.match(css, /\.phase12TarotHome\.entry-quick \.velaHomeEntry\s*\{[^}]*background:/isu);
  assert.match(css, /\.phase12TarotHome\.entry-quick \.phase12HomeBubble\s*\{[^}]*position:\s*static\s*!important/isu);
});
