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
  assert.match(controller, /createMistLayer/u);
  assert.doesNotMatch(controller, /tarot-card-back\.webp/u);
  assert.doesNotMatch(controller, /MutationObserver/u);
  assert.doesNotMatch(controller, /offsetWidth/u);
  assert.doesNotMatch(controller, /cloneNode/u);
});

test("mist transition is layered, atmospheric, and compositor-friendly", async () => {
  const [css, controller] = await Promise.all([
    readFile(motionCssPath, "utf8"),
    readFile(controllerPath, "utf8"),
  ]);

  assert.match(controller, /velaMistCloudA/u);
  assert.match(controller, /velaMistCloudB/u);
  assert.match(controller, /velaMistCloudC/u);
  assert.match(controller, /force3D:\s*true/u);
  assert.match(controller, /willChange:\s*"transform,opacity"/u);
  assert.doesNotMatch(controller, /filter:/u);
  assert.doesNotMatch(controller, /Eclipse|Cinematic|Orbit|Gleam/u);
  assert.match(css, /\.velaMistTransition/u);
  assert.match(css, /\.velaMistCloudA/u);
  assert.match(css, /radial-gradient\(ellipse/u);
  assert.doesNotMatch(css, /\.velaEclipseCard|\.velaEclipseOrbit/u);
  assert.doesNotMatch(css, /@keyframes velaTopPageToDeckBottom/u);
});

test("home cover keeps mist visible until assets are ready and starts after first paint", async () => {
  const [stage, css] = await Promise.all([
    readFile(stagePath, "utf8"),
    readFile(motionCssPath, "utf8"),
  ]);

  assert.match(stage, /import \{ gsap \} from "gsap"/u);
  assert.match(stage, /useEffect/u);
  assert.match(stage, /loaded\.hooded/u);
  assert.match(stage, /loaded\.crystal/u);
  assert.match(stage, /requestAnimationFrame/u);
  assert.match(stage, /\.velaHomeIntroMist/u);
  assert.match(stage, /\.velaHomeIntroMistCloudA/u);
  assert.match(stage, /\.velaCrystalHint/u);
  assert.match(stage, /gsap\.timeline/u);
  assert.match(stage, /prefersReducedMotion/u);
  assert.match(css, /\.velaHomeIntroMist[\s\S]*opacity:\s*1/u);
  assert.match(css, /\.velaHomeIntroMistCloudA/u);
  assert.match(css, /data-intro-complete/u);
});
