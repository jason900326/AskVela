import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const layoutPath = new URL("../app/layout.js", import.meta.url);
const cssPath = new URL("../app/free-three-selection-scroll.css", import.meta.url);

test("Free three-card selection uses native document scrolling on mobile", async () => {
  const [layout, css] = await Promise.all([
    readFile(layoutPath, "utf8"),
    readFile(cssPath, "utf8"),
  ]);

  const cleanupImport = layout.indexOf('import "./phase12a-ux-cleanup.css"');
  const selectionImport = layout.indexOf('import "./free-three-selection-scroll.css"');
  assert.ok(cleanupImport >= 0 && selectionImport > cleanupImport, "selection scroll override must load last");

  assert.match(css, /body:has\(\.immersiveQuickTarot\.stage-select\)[\s\S]*overflow-y:\s*auto\s*!important/u);
  assert.match(css, /\.quickTarotExperience\.immersiveQuickTarot\.stage-select[\s\S]*height:\s*auto\s*!important/u);
  assert.match(css, /\.immersiveQuickTarot\.stage-select \.quickTarotShell[\s\S]*overflow:\s*visible\s*!important/u);
  assert.match(css, /\.immersiveQuickTarot\.stage-select \.velaFlipDeck[\s\S]*overflow:\s*visible\s*!important/u);
  assert.match(css, /\.immersiveQuickTarot\.stage-select \.deepSelectCard[\s\S]*height:\s*auto\s*!important/u);
});
