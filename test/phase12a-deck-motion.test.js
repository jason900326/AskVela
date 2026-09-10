import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const layoutPath = new URL("../app/layout.js", import.meta.url);
const packagePath = new URL("../package.json", import.meta.url);
const flipPagePath = new URL("../components/VelaFlipPage.js", import.meta.url);
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

test("page-stack motion uses GSAP lifecycle events instead of observing and reflowing the whole document", async () => {
  const [pkg, flipPage, controller] = await Promise.all([
    readFile(packagePath, "utf8"),
    readFile(flipPagePath, "utf8"),
    readFile(controllerPath, "utf8"),
  ]);

  assert.match(pkg, /"gsap":\s*"3\.15\.0"/u);
  assert.match(flipPage, /useLayoutEffect/u);
  assert.match(flipPage, /vela:flip-page-ready/u);
  assert.match(controller, /import \{ gsap \} from "gsap"/u);
  assert.match(controller, /gsap\.timeline/u);
  assert.match(controller, /VELA_FLIP_PAGE_READY_EVENT/u);
  assert.doesNotMatch(controller, /MutationObserver/u);
  assert.doesNotMatch(controller, /offsetWidth/u);
});

test("deck transition only animates compositor-friendly transforms and opacity", async () => {
  const [css, controller] = await Promise.all([
    readFile(motionCssPath, "utf8"),
    readFile(controllerPath, "utf8"),
  ]);

  assert.match(controller, /xPercent:\s*40/u);
  assert.match(controller, /zIndex:\s*1/u);
  assert.match(controller, /autoAlpha:\s*1/u);
  assert.match(controller, /force3D:\s*true/u);
  assert.match(controller, /willChange:\s*"transform,opacity"/u);
  assert.doesNotMatch(controller, /filter:/u);
  assert.doesNotMatch(css, /@keyframes velaTopPageToDeckBottom/u);
  assert.doesNotMatch(css, /@keyframes velaNextPageFadeIn/u);
  assert.match(css, /moving backdrop-filter layer is expensive on iOS/u);
});
