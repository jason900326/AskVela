import assert from "node:assert/strict";
import test from "node:test";
import {
  VELA_SPEECH_VERSION,
  buildAstrologySpeechInput,
  buildDreamSpeechInput,
  buildHighStakesSpeechFallback,
  buildTarotSpeechInput,
  buildVelaSpeechInstructions,
  normalizeVelaSpeech,
  renderVelaSpeech,
  speechRecordForStorage,
} from "../lib/vela-speech.js";

const safety = { isHighStakes: false, categories: [], notices: [] };

test("shared speech renderer is a delivery layer, not another interpretation engine", () => {
  const instructions = buildVelaSpeechInstructions(safety);
  assert.match(instructions, /你現在不是分析引擎/u);
  assert.match(instructions, /只能重組輸入裡已經存在的意思/u);
  assert.match(instructions, /不要企圖把分析裡每一點都講完/u);
  assert.match(instructions, /禁止使用『不是 A，而是 B』/u);
  assert.match(instructions, /他現在……/u);
  assert.match(instructions, /不要使用 bullet/u);
  assert.match(instructions, /0–1 次就夠/u);
  assert.match(instructions, /不要故意結巴、打錯字/u);
  assert.equal(VELA_SPEECH_VERSION, "shared-speech-v2");
});

test("mode-specific speech instructions keep one Vela without flattening the tasks", () => {
  const astrology = buildVelaSpeechInstructions(safety, { mode: "astrology" });
  const dream = buildVelaSpeechInstructions(safety, { mode: "dream" });
  assert.match(astrology, /不是星座專欄/u);
  assert.match(astrology, /selectedSign 只是這次閱讀的視角/u);
  assert.match(dream, /夢的意義不是固定字典/u);
  assert.match(dream, /資料很少時就說少一點/u);
});

test("speech retry instructions become stricter without changing the analysis contract", () => {
  const instructions = buildVelaSpeechInstructions(safety, { retry: true, mode: "dream" });
  assert.match(instructions, /Speech Layer 的修正重試/u);
  assert.match(instructions, /完全避開工整對偶句/u);
  assert.match(instructions, /第三人稱內在斷言/u);
  assert.match(instructions, /高風險行動指令/u);
});

test("Tarot speech input receives grounded interpretation instead of raw source excerpts", () => {
  const input = buildTarotSpeechInput({
    reading: {
      question: "我最近要不要換工作？",
      spread: { id: "single-guidance", nameZhTw: "單張指引" },
    },
    cards: [{
      cardId: "four-of-swords",
      nameZhTw: "寶劍四",
      orientation: "upright",
      positionLabelZhTw: "指引",
      contextInterpretation: "先留一點恢復判斷力的空間。",
      practicalFocus: "先休息，再看去留。",
      sourceMeaning: "這個原典欄位不應直接送進 speech input。",
    }],
    synthesis: {
      overview: "先把疲累和去留拆開。",
      narrative: "長期緊繃可能讓離職念頭變得更急。",
      crossCardPattern: "",
      practicalGuidance: ["先休息"],
      reflectionQuestions: [],
    },
    safety,
  });

  assert.match(input, /先留一點恢復判斷力的空間/u);
  assert.match(input, /長期緊繃可能/u);
  assert.doesNotMatch(input, /這個原典欄位不應直接送進 speech input/u);
});

test("Astrology and Dream speech inputs receive completed analysis but no provenance excerpts", () => {
  const astrology = buildAstrologySpeechInput({
    sign: { id: "virgo", nameZhTw: "處女座" },
    period: "daily",
    localDate: "2026-09-08",
    analysis: { overview: "今天先整理。", overall: "步調慢一點。", basisNote: "來源方法留在分析裡。" },
  });
  const dream = buildDreamSpeechInput({
    dreamText: "我夢到火車。",
    wakingLifeContext: "最近在等結果。",
    analysis: {
      overview: "先沿著等待感看。",
      hypotheses: [{ title: "等待", interpretation: "近期素材可能進入夢裡。", evidenceIds: ["day-residue"] }],
    },
  });

  assert.match(astrology, /今天先整理/u);
  assert.doesNotMatch(astrology, /sourceEvidence|retrievedSources|excerpt/u);
  assert.match(dream, /我夢到火車/u);
  assert.match(dream, /近期素材可能進入夢裡/u);
  assert.doesNotMatch(dream, /retrievedSources|sourceEvidence|excerpt/u);
});

test("invalid speech shape falls back field-by-field to grounded analysis", () => {
  const fallback = {
    overview: "原本 grounded overview",
    narrative: "原本 grounded narrative，這段內容足夠長，可以安全作為 fallback。",
  };
  const result = normalizeVelaSpeech({
    overview: "# 標題",
    narrative: "太短",
  }, fallback);

  assert.equal(result.overview, fallback.overview);
  assert.equal(result.narrative, fallback.narrative);
  assert.deepEqual(result.fallbackFields, ["overview", "narrative"]);
  assert.equal(result.usedFallback, true);
  assert.deepEqual(result.violations, ["format", "length"]);
});

test("polished contrast and unsupported third-party inner-state phrasing trigger a retry candidate", () => {
  const fallback = {
    overview: "先看互動本身。",
    narrative: "象徵材料只能提供互動上的可能性，不能替另一個人回答內心狀態。",
  };
  const result = normalizeVelaSpeech({
    overview: "真正的重點是先談清楚。",
    narrative: "他現在有一種不滿的感覺，所以你們需要先停一下再說。",
  }, fallback);

  assert.deepEqual(result.fallbackFields, ["overview", "narrative"]);
  assert.deepEqual(result.violations, ["polished-contrast", "third-party-inner-state"]);
  assert.equal(result.usedFallback, true);
});

test("high-stakes directive phrasing is rejected even when the speech sounds natural", () => {
  const fallback = {
    overview: "這題先回到你的決策規則。",
    narrative: "這次解讀只能協助整理情緒與節奏，實際買賣仍要回到可靠資料與風險承受能力。",
  };
  const result = normalizeVelaSpeech({
    overview: "先不要只因為慌就全賣。",
    narrative: "你可以先把資料整理好，再決定要怎麼處理。",
  }, fallback, {
    safety: { isHighStakes: true, categories: ["financial"], notices: [] },
  });

  assert.equal(result.overview, fallback.overview);
  assert.deepEqual(result.fallbackFields, ["overview"]);
  assert.deepEqual(result.violations, ["high-stakes-directive:financial"]);
});

test("shared renderer retries only presentation and returns the second valid speech", async () => {
  const calls = [];
  const openai = {
    responses: {
      create: async (request) => {
        calls.push(request);
        return {
          output_text: JSON.stringify(calls.length === 1
            ? { overview: "真正的重點是今天別衝。", narrative: "先慢一點，讓事情自己排出順序。" }
            : { overview: "今天先慢一點。", narrative: "有些事情正在一起靠近，你不用現在全部處理。先把最吵的那一件放下來看，其他的晚一點再說也可以。" }),
        };
      },
    },
  };

  const rendered = await renderVelaSpeech({
    client: openai,
    model: "test-model",
    mode: "astrology",
    input: "{}",
    fallback: { overview: "fallback overview", narrative: "fallback narrative 足夠長，可以作為安全退路。" },
  });

  assert.equal(calls.length, 2);
  assert.equal(calls[0].text.format.name, "askvela_astrology_speech");
  assert.match(calls[1].instructions, /Speech Layer 的修正重試/u);
  assert.equal(rendered.status, "rendered");
  assert.equal(rendered.attempts, 2);
  assert.equal(rendered.speech.overview, "今天先慢一點。");
});

test("high-stakes speech fallback never delegates a financial decision to symbolic reading", () => {
  const result = buildHighStakesSpeechFallback({
    isHighStakes: true,
    categories: ["financial"],
    notices: ["若問題涉及投資或重大財務決策，請依可靠資料評估。"],
  });

  assert.match(result.overview, /不會用象徵解讀替你決定買賣/u);
  assert.match(result.narrative, /可靠資料/u);
  assert.match(result.narrative, /專業人士/u);
  assert.equal(result.safeFallback, true);
  assert.equal(result.usedFallback, true);
});

test("speech records can be stored and restored without trusting arbitrary shapes", () => {
  const stored = speechRecordForStorage({
    version: VELA_SPEECH_VERSION,
    status: "rendered",
    attempts: 1,
    fallbackFields: [],
    violations: [],
    safeFallback: false,
    overview: "先看這裡。",
    narrative: "這是一段已經完成的 Vela speech，保存後應該仍然能正常還原。",
  });
  assert.equal(stored.version, VELA_SPEECH_VERSION);
  assert.equal(stored.status, "rendered");
  assert.equal(stored.attempts, 1);
  assert.equal(speechRecordForStorage({ overview: "", narrative: "" }), null);
});
