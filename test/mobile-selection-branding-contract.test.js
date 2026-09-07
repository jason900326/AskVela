import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const layoutPath = new URL("../app/layout.js", import.meta.url);
const brandCssPath = new URL("../app/brand.css", import.meta.url);
const selectionCssPath = new URL("../app/mobile-selection.css", import.meta.url);
const interpretRoutePath = new URL("../app/api/readings/interpret/route.js", import.meta.url);

test("active pages keep a compact Vela wordmark", async () => {
  const [layout, brandCss] = await Promise.all([
    readFile(layoutPath, "utf8"),
    readFile(brandCssPath, "utf8"),
  ]);

  assert.match(layout, /<span>VELA<\/span>/u);
  assert.match(layout, /title: "Vela"/u);
  assert.match(brandCss, /\.brandMark/u);
  assert.match(brandCss, /VELA · TAROT READING/u);
});

test("mobile selection shows all twelve choices without horizontal scrolling", async () => {
  const css = await readFile(selectionCssPath, "utf8");

  assert.match(css, /grid-template-columns:\s*repeat\(6,\s*minmax\(44px,\s*1fr\)\)/u);
  assert.match(css, /overflow:\s*visible/u);
  assert.match(css, /margin-left:\s*0/u);
  assert.match(css, /min-width:\s*44px/u);
});

test("interpretation retries one transient failure while preserving the same request payload", async () => {
  const route = await readFile(interpretRoutePath, "utf8");

  assert.match(route, /interpretWithOneRetry/u);
  assert.match(route, /return await interpretTarotReading\(input\)/u);
  assert.match(route, /return interpretTarotReading\(input\)/u);
  assert.match(route, /isNonRetryableInterpretationError/u);
});
