import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const layoutPath = new URL("../app/layout.js", import.meta.url);
const packagePath = new URL("../package.json", import.meta.url);
const flipPagePath = new URL("../components/VelaFlipPage.js", import.meta.url);
const motionCssPath = new URL("../app/phase12a-deck-motion.css", import.meta.url);
const controllerPath = new URL("../components/VelaPageStackMotion.js", import.meta.url);
const stagePath = new URL("../components/VelaStage.js", import.meta.url);

test("Vela motion overrides load last and mount the shared transition controller", async () => {
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

test("Vela transition uses GSAP lifecycle events without observing or cloning whole pages", async () => {
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
  assert.match(controller, /createCinematicLayer/u);
  assert.doesNotMatch(controller, /tarot-card-back\.webp/u);
  assert.doesNotMatch(controller, /MutationObserver/u);
  assert.doesNotMatch(controller, /offsetWidth/u);
  assert.doesNotMatch(controller, /cloneNode/u);
});

test("cinematic transition avoids game-like emblems and keeps motion compositor-friendly", async () => {
  const [css, controller] = await Promise.all([
    readFile(motionCssPath, "utf8"),
    readFile(controllerPath, "utf8"),
  ]);

  assert.match(controller, /velaCinematicVeil/u);
  assert.match(controller, /velaCinematicLight/u);
  assert.match(controller, /velaCinematicVignette/u);
  assert.match(controller, /force3D:\s*true/u);
  assert.match(controller, /willChange:\s*"transform,opacity"/u);
  assert.doesNotMatch(controller, /filter:/u);
  assert.doesNotMatch(controller, /EclipseOrbit|EclipseCard|EclipseGleam/u);
  assert.match(css, /\.velaCinematicTransition/u);
  assert.match(css, /\.velaCinematicVeil/u);
  assert.match(css, /\.velaCinematicLight/u);
  assert.doesNotMatch(css, /\.velaEclipseCard|\.velaEclipseOrbit/u);
  assert.doesNotMatch(css, /@keyframes velaTopPageToDeckBottom/u);
});

test("home cover has a restrained GSAP opening sequence before the crystal CTA appears", async () => {
  const stage = await readFile(stagePath, "utf8");

  assert.match(stage, /import \{ gsap \} from "gsap"/u);
  assert.match(stage, /useLayoutEffect/u);
  assert.match(stage, /data\.introReady|dataset\.introReady/u);
  assert.match(stage, /\.velaCharacterSlot/u);
  assert.match(stage, /\.velaCrystalButton/u);
  assert.match(stage, /\.velaCrystalHint/u);
  assert.match(stage, /gsap\.timeline/u);
  assert.match(stage, /prefersReducedMotion/u);
});
