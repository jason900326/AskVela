import assert from "node:assert/strict";
import test from "node:test";
import { createDreamReading } from "../lib/dream-reading.js";

const extraction = {
  people: [],
  places: ["火車站"],
  objects: ["火車"],
  actions: ["等待"],
  emotions: ["焦急"],
  themes: ["travel"],
  notableImages: ["火車離開月台"],
  summary: "看著火車離開",
};

const analysis = {
  overview: "這個夢可以先沿著等待與錯過的感覺看。",
  whatStandsOut: ["火車離開", "醒來前仍在等待"],
  hypotheses: [
    {
      title: "近期等待感進了夢裡",
      interpretation: "如果最近剛好有事情懸著，夢可能把那種等待感借給了火車這個畫面。",
      evidenceIds: ["day-residue"],
    },
    {
      title: "先保留你自己的聯想",
      interpretation: "火車對你本人也可能有更私人的記憶或感覺，這部分不需要先被固定成某個象徵。",
      evidenceIds: ["personal-associations"],
    },
  ],
  wakingLifeConnection: "可以留意最近是否有一件事情讓你一直等著結果。",
  reflectionQuestions: ["火車離開時，你最先想到的是錯過、鬆一口氣，還是別的？"],
  groundingNote: "這些只是歷史框架下的解讀假說，不是診斷或預言。",
  basisNote: "依據 Freud 的近期生活素材與個人聯想原則。",
};

const speech = {
  overview: "我會先停在那個『來不及』的感覺。",
  narrative: "火車離開這個畫面很容易讓人往錯過上想，但先不用急著把它定義死。最近如果真的有什麼事情懸著、還在等結果，這個夢可能只是把那股等不到的感覺放大了一點。你對火車自己的記憶，反而會比固定象徵更有用。",
};

test("Dream keeps extraction and grounded analysis separate from shared Vela speech", async () => {
  const calls = [];
  const openai = {
    responses: {
      create: async (request) => {
        calls.push(request);
        const name = request.text?.format?.name;
        if (name === "askvela_dream_extraction") return { output_text: JSON.stringify(extraction) };
        if (name === "askvela_dream_reading") return { output_text: JSON.stringify(analysis) };
        if (name === "askvela_dream_speech") return { output_text: JSON.stringify(speech) };
        throw new Error(`unexpected request ${name}`);
      },
    },
  };

  const reading = await createDreamReading({
    dreamText: "我夢到火車離開月台，我還站在原地。",
    wakingLifeContext: "最近正在等一個重要結果。",
    requestId: "dream-speech-test-1234",
  }, {
    openai,
    model: "test-model",
    retrievePassages: async () => [],
  });

  assert.equal(calls.length, 3);
  assert.equal(calls[0].text.format.name, "askvela_dream_extraction");
  assert.equal(calls[1].text.format.name, "askvela_dream_reading");
  assert.equal(calls[2].text.format.name, "askvela_dream_speech");
  assert.equal(calls[2].max_output_tokens, 500);

  const speechInput = JSON.parse(calls[2].input);
  assert.equal(speechInput.userDream, "我夢到火車離開月台，我還站在原地。");
  assert.equal(speechInput.groundedAnalysis.overview, analysis.overview);
  assert.equal(speechInput.retrievedSources, undefined);
  assert.equal(speechInput.sourceEvidence, undefined);

  assert.equal(reading.result.overview, analysis.overview);
  assert.equal(reading.result.hypotheses.length, 2);
  assert.equal(reading.velaSpeech.status, "rendered");
  assert.equal(reading.velaSpeech.attempts, 1);
  assert.equal(reading.velaSpeech.overview, speech.overview);
  assert.equal(reading.sourceGrounded, true);
  assert.equal(reading.sourceMode, "curated-public-domain-principles");
});
