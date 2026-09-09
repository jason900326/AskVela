import test from "node:test";
import assert from "node:assert/strict";
import {
  RETENTION_MAX_TURNS,
  createRetentionContinuation,
  normalizeContinuationMessage,
  normalizeContinuationTurns,
} from "../lib/retention-continuation.js";

test("Retention normalizes user messages and rejects empty follow-ups", () => {
  assert.equal(normalizeContinuationMessage("  我想接著問這件事  "), "我想接著問這件事");
  assert.throws(() => normalizeContinuationMessage(" "), /至少再告訴 Vela/u);
});

test("Retention keeps at most the latest six valid turns", () => {
  const turns = Array.from({ length: 8 }, (_, index) => ({
    question: `Q${index}`,
    answer: `A${index}`,
    reflectionQuestion: "",
    createdAt: "2026-09-09T00:00:00.000Z",
  }));
  const normalized = normalizeContinuationTurns(turns);
  assert.equal(normalized.length, RETENTION_MAX_TURNS);
  assert.equal(normalized[0].question, "Q2");
  assert.equal(normalized.at(-1).question, "Q7");
});

test("Tarot continuation reuses the saved reading and never asks for a new draw", async () => {
  let captured = null;
  const openai = {
    responses: {
      create: async (payload) => {
        captured = payload;
        return {
          output_text: JSON.stringify({
            answer: "這次先沿用原本那三張牌看你剛補充的情況。",
            reflectionQuestion: "",
          }),
        };
      },
    },
  };

  const snapshot = {
    question: "我該換工作嗎？",
    spread_name_zh_tw: "現況・阻礙・建議",
    reading_result: {
      cards: [
        {
          nameZhTw: "寶劍四",
          positionLabelZhTw: "現況",
          orientation: "upright",
          contextInterpretation: "先退開工作噪音。",
          practicalFocus: "先恢復。",
        },
      ],
      synthesis: {
        overview: "先分清耗竭與方向。",
        narrative: "原解讀內容",
        crossCardPattern: "原牌面關係",
        practicalGuidance: ["先休息"],
      },
    },
    reading_messages: [],
  };

  const turn = await createRetentionContinuation({
    kind: "tarot",
    snapshot,
    turns: [],
    message: "如果我休息後還是想走呢？",
  }, { openai, model: "test-model" });

  assert.match(turn.answer, /原本那三張牌/u);
  assert.equal(turn.question, "如果我休息後還是想走呢？");
  assert.equal(captured.model, "test-model");
  assert.match(captured.instructions, /不要重抽/u);
  assert.match(captured.instructions, /原本固定的牌/u);
  assert.match(captured.input, /寶劍四/u);
  assert.match(captured.input, /我該換工作嗎/u);
});

test("Retention refuses a seventh continuation turn", async () => {
  const turns = Array.from({ length: RETENTION_MAX_TURNS }, (_, index) => ({
    question: `問題${index}`,
    answer: `回答${index}`,
    reflectionQuestion: "",
    createdAt: "2026-09-09T00:00:00.000Z",
  }));

  await assert.rejects(
    () => createRetentionContinuation({
      kind: "dream",
      snapshot: {},
      turns,
      message: "我還想問一件事",
    }, {
      openai: { responses: { create: async () => { throw new Error("should not call model"); } } },
      model: "test-model",
    }),
    /先聊到這裡/u,
  );
});
