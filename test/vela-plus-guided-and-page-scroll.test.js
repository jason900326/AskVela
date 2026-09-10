import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const experiencePath = new URL("../components/VelaExperience.js", import.meta.url);
const flipPath = new URL("../components/VelaFlipPage.js", import.meta.url);

test("Vela+ can never fall through startQuick into the Free Tarot flow", async () => {
  const experience = await readFile(experiencePath, "utf8");

  assert.match(
    experience,
    /function startQuick[\s\S]*if \(!text \|\| text\.length > 500 \|\| !planReady\) return;[\s\S]*if \(isVelaPlus\)[\s\S]*startDeepReading\(plusSeed\);[\s\S]*return;[\s\S]*setExperience\("quick-tarot"\)/u,
  );
  assert.match(
    experience,
    /const nextSeed = seed\?\.question[\s\S]*question: String\(seed\.question\)[\s\S]*plan: seed\.plan \|\| null/u,
  );
});

test("every Vela page transition resets document scroll before the next page is shown", async () => {
  const flip = await readFile(flipPath, "utf8");

  assert.match(flip, /useLayoutEffect\(\(\) => \{[\s\S]*window\.scrollTo\(\{ top: 0, left: 0, behavior: "auto" \}\)/u);
  assert.match(flip, /\}, \[pageKey\]\);/u);
});
