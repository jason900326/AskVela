import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const experiencePath = new URL("../components/VelaExperience.js", import.meta.url);
const freePath = new URL("../components/FreeThreeCardTarot.js", import.meta.url);
const trialPath = new URL("../components/VelaDeepTrialReading.js", import.meta.url);
const interpreterPath = new URL("../lib/reading-interpreter.js", import.meta.url);
const routePath = new URL("../app/api/readings/interpret/route.js", import.meta.url);
const trialRoutePath = new URL("../app/api/deep-trial/route.js", import.meta.url);
const trialMigrationPath = new URL("../supabase/migrations/20260910101559_deep_reading_trial_entitlement.sql", import.meta.url);
const immutableMigrationPath = new URL("../supabase/migrations/20260910111300_deep_reading_trial_immutable.sql", import.meta.url);

test("Free Tarot chooses three cards but only previews the first card", async () => {
  const free = await readFile(freePath, "utf8");

  assert.match(free, /selectedIndexes\.length !== 3/u);
  assert.match(free, /selectedCardIndexes: selectedIndexes/u);
  assert.match(free, /previewCardCount: 1/u);
  assert.match(free, /免費先看第一張/u);
  assert.match(free, /另外兩張牌，還在這裡/u);
  assert.match(free, /登入，免費完成深度解析/u);
  assert.doesNotMatch(free, /selectedCardIndexes: \[selectedIndex\]/u);
});

test("one-card preview reuses the same three-card reading identity", async () => {
  const [interpreter, route] = await Promise.all([
    readFile(interpreterPath, "utf8"),
    readFile(routePath, "utf8"),
  ]);

  assert.match(route, /previewCardCount: body\?\.previewCardCount/u);
  assert.match(interpreter, /const fullDraw = createTarotDraw/u);
  assert.match(interpreter, /readingId !== fullDraw\.readingId/u);
  assert.match(interpreter, /sliceDrawForPreview\(fullDraw, previewCount\)/u);
  assert.match(interpreter, /readingId: fullDraw\.readingId/u);
  assert.match(interpreter, /selectedCardIndexes: fullDraw\.selectedCardIndexes/u);
});

test("login resumes the same draw instead of asking the user to redraw", async () => {
  const [experience, trial] = await Promise.all([
    readFile(experiencePath, "utf8"),
    readFile(trialPath, "utf8"),
  ]);

  assert.match(experience, /askvela\.pending-deep-trial\.v1/u);
  assert.match(experience, /claimAndEnterDeepTrial/u);
  assert.match(experience, /setExperience\("deep-trial"\)/u);
  assert.match(experience, /VelaDeepTrialReading/u);
  assert.doesNotMatch(experience, /deep-trial\.used/u);
  assert.doesNotMatch(experience, /markDeepTrialUsed/u);
  assert.match(trial, /const draw = seed\?\.draw/u);
  assert.match(trial, /const \[revealedIndexes, setRevealedIndexes\] = useState\(\[0\]\)/u);
  assert.match(trial, /第一張剛才已經看過了/u);
  assert.match(trial, /selectedCardIndexes: selectedIndexes/u);
  assert.doesNotMatch(trial, /fetch\("\/api\/readings\/draw"/u);
});

test("Deep trial entitlement is server-side, atomic, and immutable", async () => {
  const [experience, route, migration, immutableMigration] = await Promise.all([
    readFile(experiencePath, "utf8"),
    readFile(trialRoutePath, "utf8"),
    readFile(trialMigrationPath, "utf8"),
    readFile(immutableMigrationPath, "utf8"),
  ]);

  assert.match(experience, /fetch\("\/api\/deep-trial"/u);
  assert.match(experience, /Authorization: `Bearer \$\{token\}`/u);
  assert.match(route, /getAuthenticatedSupabase\(request\)/u);
  assert.match(route, /reason: "TRIAL_ALREADY_USED"/u);
  assert.match(route, /error\.code === "23505"/u);
  assert.match(migration, /user_id uuid primary key references auth\.users/u);
  assert.match(migration, /enable row level security/u);
  assert.match(immutableMigration, /revoke update on public\.deep_reading_trials from authenticated/u);
  assert.match(immutableMigration, /drop policy if exists "deep_reading_trials_update_own"/u);
  assert.doesNotMatch(immutableMigration, /grant update/u);
});

test("trial gives the Deep payoff and only one normal follow-up", async () => {
  const trial = await readFile(trialPath, "utf8");

  assert.match(trial, /result\.cards\.slice\(1, walkthroughCount\)/u);
  assert.match(trial, /VELA 的結論/u);
  assert.match(trial, /followUps\.length >= 1/u);
  assert.match(trial, /followUps\.length === 0/u);
  assert.match(trial, /那這一點可以補一張/u);
  assert.match(trial, /這次免費深度解析已使用/u);
});
