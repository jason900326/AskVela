import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  buildDeepReadingQuestion,
  DEEP_READING_SPREAD_ID,
  planDeepReading,
} from "../lib/deep-reading-intake.js";

const routePath = new URL("../app/api/deep-reading/intake/route.js", import.meta.url);
const deepPath = new URL("../components/VelaDeepReadingIntro.js", import.meta.url);
const layoutPath = new URL("../app/layout.js", import.meta.url);
const cssPath = new URL("../app/phase12a-deep-reading.css", import.meta.url);

const MOCK_PLAN = {
  readingTitle: "關係是否值得繼續投入",
  velaLine: "你同時在意對方的變化，也在衡量自己還要不要繼續投入。",
  clarifyingQuestion: "這次你最想先弄清楚哪一件事？",
  options: [
    {
      id: "a",
      label: "我要不要繼續投入",
      focusQuestion: "這段關係目前是否值得我繼續投入？",
      lenses: [
        { label: "我現在的位置", purpose: "看我目前實際投入與承受的狀態" },
        { label: "真正卡住的地方", purpose: "看這段關係目前最核心的拉扯或未知" },
        { label: "接下來怎麼判斷", purpose: "看我下一步值得觀察的現實訊號" },
      ],
    },
    {
      id: "b",
      label: "我們的互動到底變了什麼",
      focusQuestion: "這段關係最近的互動變化，最值得我注意的是什麼？",
      lenses: [
        { label: "目前互動", purpose: "看現在可觀察到的互動狀態" },
        { label: "變化核心", purpose: "看關係中最需要釐清的張力" },
        { label: "下一個訊號", purpose: "看接下來可用來判斷的行為或界線" },
      ],
    },
  ],
};

test("Deep Reading intake makes one structured model call and returns dynamic clarification choices", async () => {
  let request = null;
  const openai = {
    responses: {
      create: async (nextRequest) => {
        request = nextRequest;
        return { output_text: JSON.stringify(MOCK_PLAN) };
      },
    },
  };

  const result = await planDeepReading(
    "我們最近越來越少說話，我不知道是自己太敏感，還是這段關係真的變了。",
    { openai, model: "test-small-model" },
  );

  assert.equal(request.model, "test-small-model");
  assert.equal(request.text.format.type, "json_schema");
  assert.equal(result.options.length, 2);
  assert.equal(result.spreadId, DEEP_READING_SPREAD_ID);
  assert.equal(result.options[0].lenses.length, 3);
  assert.match(result.options[0].readingQuestion, /核心問題/u);
  assert.match(result.options[0].readingQuestion, /位置1/u);
});

test("Deep Reading keeps the deterministic draw question within the existing 500-character contract", () => {
  const question = buildDeepReadingQuestion({
    originalQuestion: "很長的背景".repeat(100),
    focusQuestion: "我現在真正需要判斷的是什麼？".repeat(20),
    lenses: MOCK_PLAN.options[0].lenses,
  });

  assert.ok(question.length <= 500);
  assert.match(question, /位置1/u);
  assert.match(question, /位置2/u);
  assert.match(question, /位置3/u);
});

test("Deep Reading API and UI wire intake, three selected cards, staged reveal, follow-up, and one clarifier", async () => {
  const [route, deep, layout, css] = await Promise.all([
    readFile(routePath, "utf8"),
    readFile(deepPath, "utf8"),
    readFile(layoutPath, "utf8"),
    readFile(cssPath, "utf8"),
  ]);

  assert.match(route, /planDeepReading/u);
  assert.match(deep, /\/api\/deep-reading\/intake/u);
  assert.match(deep, /selectedIndexes\.length !== 3/u);
  assert.match(deep, /selectedCardIndexes: selectedIndexes/u);
  assert.match(deep, /setRevealedCount/u);
  assert.match(deep, /\/api\/readings\/follow-up/u);
  assert.match(deep, /followUpResolution/u);
  assert.match(deep, /\/api\/readings\/clarifier/u);
  assert.match(layout, /phase12a-deep-reading\.css/u);
  assert.match(css, /\.deepDynamicChoices/u);
  assert.match(css, /\.deepCardWalkthrough/u);
  assert.match(css, /\.deepClarifierPool/u);
});
