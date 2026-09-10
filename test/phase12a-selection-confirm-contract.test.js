import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const confirmPath = new URL("../components/FreeTarotSelectionConfirm.js", import.meta.url);
const layoutPath = new URL("../app/layout.js", import.meta.url);
const stabilityCssPath = new URL("../app/phase12a-mobile-stability.css", import.meta.url);

test("Free Tarot requires explicit confirmation before the original card click proceeds", async () => {
  const [confirm, layout] = await Promise.all([
    readFile(confirmPath, "utf8"),
    readFile(layoutPath, "utf8"),
  ]);

  assert.match(confirm, /CARD_SELECTOR/u);
  assert.match(confirm, /event\.preventDefault\(\)/u);
  assert.match(confirm, /event\.stopPropagation\(\)/u);
  assert.match(confirm, /確定選這張嗎？/u);
  assert.match(confirm, />換一張</u);
  assert.match(confirm, />就是這張</u);
  assert.match(confirm, /requestAnimationFrame\(\(\) => card\.click\(\)\)/u);
  assert.match(layout, /FreeTarotSelectionConfirm/u);
});

test("Free question entry is visually separated from the Vela landing artwork", async () => {
  const css = await readFile(stabilityCssPath, "utf8");

  assert.match(css, /\.phase12TarotHome\.entry-quick \.velaHomeStageLayout\s*\{[^}]*opacity:\s*0\s*!important/isu);
  assert.match(css, /visibility:\s*hidden\s*!important/u);
  assert.match(css, /\.phase12TarotHome\.entry-quick \.velaHomeEntry\s*\{[^}]*background:/isu);
  assert.match(css, /\.phase12TarotHome\.entry-quick \.phase12HomeBubble\s*\{[^}]*position:\s*static\s*!important/isu);
});
