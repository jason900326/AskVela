import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const layoutPath = new URL("../app/layout.js", import.meta.url);
const stabilityCssPath = new URL("../app/phase12a-mobile-stability.css", import.meta.url);

test("Phase 12A mobile stability overrides load after the earlier quick-Tarot styles", async () => {
  const layout = await readFile(layoutPath, "utf8");
  const earlier = layout.indexOf('import "./phase12a-free-flow-fixes.css";');
  const stability = layout.indexOf('import "./phase12a-mobile-stability.css";');

  assert.ok(earlier >= 0);
  assert.ok(stability > earlier);
});

test("awakened Free home gets an opaque readable surface instead of artwork bleeding through copy", async () => {
  const css = await readFile(stabilityCssPath, "utf8");

  assert.match(css, /\.phase12TarotHome\.entry-quick \.velaHomeStageLayout[\s\S]*brightness\(\.5\)/u);
  assert.match(css, /\.phase12TarotHome\.entry-quick \.phase12HomeFlipPage[\s\S]*rgba\(31, 18, 54, \.97\)/u);
});

test("Free wait no longer forces a login invitation card into the Tarot ritual", async () => {
  const css = await readFile(stabilityCssPath, "utf8");

  assert.match(css, /\.immersiveQuickTarot \.immersiveLoginVela[\s\S]*display:\s*none\s*!important/u);
});

test("completed Free reading uses native document scrolling instead of an iOS nested scroll box", async () => {
  const css = await readFile(stabilityCssPath, "utf8");

  assert.match(css, /body:has\(\.immersiveQuickTarot\.stage-result\)[\s\S]*overflow-y:\s*auto\s*!important/u);
  assert.match(css, /\.quickTarotExperience\.immersiveQuickTarot\.stage-result[\s\S]*height:\s*auto\s*!important/u);
  assert.match(css, /\.immersiveQuickTarot\.stage-result \.immersiveResultCard[\s\S]*overflow:\s*visible\s*!important/u);
  assert.match(css, /\.immersiveQuickTarot\.stage-result \.immersiveResultScroll[\s\S]*overflow:\s*visible\s*!important/u);
});
