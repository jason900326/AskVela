export const TAROT_SPREADS = Object.freeze([
  Object.freeze({
    id: "single-guidance",
    nameZhTw: "單張牌｜今日／問題指引",
    descriptionZhTw: "用一張牌聚焦今天或目前最值得留意的方向。",
    positions: Object.freeze([
      Object.freeze({ id: "guidance", labelZhTw: "指引" }),
    ]),
  }),
  Object.freeze({
    id: "past-present-future",
    nameZhTw: "三張牌｜過去・現在・未來",
    descriptionZhTw: "整理一件事如何形成、目前狀態，以及接下來可能的發展。",
    positions: Object.freeze([
      Object.freeze({ id: "past", labelZhTw: "過去" }),
      Object.freeze({ id: "present", labelZhTw: "現在" }),
      Object.freeze({ id: "future", labelZhTw: "未來" }),
    ]),
  }),
  Object.freeze({
    id: "situation-obstacle-advice",
    nameZhTw: "三張牌｜現況・阻礙・建議",
    descriptionZhTw: "釐清目前局面、核心阻力，以及可以採取的方向。",
    positions: Object.freeze([
      Object.freeze({ id: "situation", labelZhTw: "現況" }),
      Object.freeze({ id: "obstacle", labelZhTw: "阻礙" }),
      Object.freeze({ id: "advice", labelZhTw: "建議" }),
    ]),
  }),
]);

export const TAROT_SPREAD_BY_ID = new Map(
  TAROT_SPREADS.map((spread) => [spread.id, spread]),
);

export function getTarotSpread(spreadId) {
  return TAROT_SPREAD_BY_ID.get(String(spreadId || "")) || null;
}

