import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const layoutPath = new URL("../app/layout.js", import.meta.url);
const motionCssPath = new URL("../app/phase12a-deck-motion.css", import.meta.url);
const controllerPath = new URL("../components/VelaPageStackMotion.js", import.meta.url);

test("Vela deck motion overrides load last and mount the shared transition controller", async () => {
  const layout = await readFile(layoutPath, "utf8");
  const stability = layout.indexOf('import "./phase12a-mobile-stability.css";');
  const motion = layout.indexOf('import "./phase12a-deck-motion.css";');

  assert.ok(stability >= 0);
  assert.ok(motion > stability);
  assert.match(layout, /VelaPageStackMotion/u);
  assert.match(layout, /<VelaPageStackMotion \/>/u);
});

test("Free home keeps the Vela stage visible behind the simplified entry card", async () => {
  const css = await readFile(motionCssPath, "utf8");

  assert.match(css, /\.phase12TarotHome\.entry-quick \.velaHomeStageLayout[\s\S]*opacity:\s*\.88\s*!important/u);
  assert.match(css, /visibility:\s*visible\s*!important/u);
  assert.match(css, /\.phase12TarotHome\.entry-quick \.phase12HomeFlipPage[\s\S]*backdrop-filter:\s*blur\(6px\)/u);
});

test("the transient draw bridge never shows the preparing-label flash", async () => {
  const css = await readFile(motionCssPath, "utf8");

  assert.match(css, /\.immersiveQuickTarot\.stage-drawing \.immersivePreparingLabel[\s\S]*display:\s*none\s*!important/u);
});

test("page changes cycle the old top page toward the deck bottom before the next page finishes fading in", async () => {
  const [css, controller] = await Promise.all([
    readFile(motionCssPath, "utf8"),
    readFile(controllerPath, "utf8"),
  ]);

  assert.match(controller, /cloneNode\(true\)/u);
  assert.match(controller, /nextDeck\.prepend\(ghost\)/u);
  assert.match(controller, /MutationObserver/u);
  assert.match(controller, /isDrawingRevealBridge/u);
  assert.match(css, /@keyframes velaTopPageToDeckBottom/u);
  assert.match(css, /46%[\s\S]*translate3d\(38%, -8px, 0\)/u);
  assert.match(css, /54%[\s\S]*z-index:\s*1/u);
  assert.match(css, /@keyframes velaNextPageFadeIn/u);
  assert.match(css, /0%, 42%[\s\S]*opacity:\s*\.46/u);
});
