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

test("Vela transition reuses the detached outgoing page for a true dissolve without a full-screen veil", async () => {
  const [pkg, flipPage, controller, css] = await Promise.all([
    readFile(packagePath, "utf8"),
    readFile(flipPagePath, "utf8"),
    readFile(controllerPath, "utf8"),
    readFile(motionCssPath, "utf8"),
  ]);

  assert.match(pkg, /"gsap":\s*"3\.15\.0"/u);
  assert.match(flipPage, /useLayoutEffect/u);
  assert.match(flipPage, /vela:flip-page-ready/u);
  assert.match(controller, /createDissolveLayer/u);
  assert.match(controller, /previousPage\.isConnected/u);
  assert.match(controller, /layer\.append\(outgoingPage\)/u);
  assert.match(controller, /previousRect/u);
  assert.match(controller, /autoAlpha:\s*hasOutgoing\s*\?\s*0\.18\s*:\s*0\.72/u);
  assert.match(controller, /duration:\s*0\.36/u);
  assert.match(controller, /duration:\s*0\.42/u);
  assert.doesNotMatch(controller, /MutationObserver/u);
  assert.doesNotMatch(controller, /offsetWidth/u);
  assert.doesNotMatch(controller, /cloneNode/u);
  assert.doesNotMatch(controller, /Mist|Eclipse|Cinematic/u);
  assert.match(css, /\.velaDissolveTransition[\s\S]*background:\s*transparent/u);
  assert.doesNotMatch(css, /\.velaMistTransition|\.velaEclipseTransition|\.velaCinematicTransition/u);
});

test("home cover is visible on frame one and resolves into focus after assets are ready", async () => {
  const [stage, css] = await Promise.all([
    readFile(stagePath, "utf8"),
    readFile(motionCssPath, "utf8"),
  ]);

  assert.match(stage, /import \{ gsap \} from "gsap"/u);
  assert.match(stage, /loaded\.hooded/u);
  assert.match(stage, /loaded\.crystal/u);
  assert.match(stage, /requestAnimationFrame/u);
  assert.match(stage, /isIntroPending/u);
  assert.match(stage, /\.velaHoodedArtwork/u);
  assert.match(stage, /\.velaCrystalArtwork/u);
  assert.match(stage, /\.velaCrystalHint/u);
  assert.match(stage, /gsap\.timeline/u);
  assert.match(stage, /prefersReducedMotion/u);
  assert.doesNotMatch(stage, /velaHomeIntroMist/u);
  assert.match(css, /\.velaStage\.isIntroPending \.velaHoodedArtwork[\s\S]*opacity:\s*\.58/u);
  assert.match(css, /\.velaStage\.isIntroPending \.velaCrystalArtwork[\s\S]*opacity:\s*\.34/u);
  assert.match(css, /@keyframes velaCoverAuraBreath/u);
});
