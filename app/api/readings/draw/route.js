import { NextResponse } from "next/server";
import { createTarotDraw, DrawValidationError } from "../../../../lib/tarot-draw.js";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const body = await request.json();
    const idempotencyKey = request.headers.get("Idempotency-Key") || body?.requestId;
    const draw = createTarotDraw({
      question: body?.question,
      spreadId: body?.spreadId,
      idempotencyKey,
      selectedCardIndexes: body?.selectedCardIndexes,
    });

    return NextResponse.json(draw, {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof DrawValidationError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 400 },
      );
    }

    console.error("/api/readings/draw failed", error);
    return NextResponse.json(
      { error: "目前無法完成抽牌，請稍後再試。", code: "DRAW_FAILED" },
      { status: 500 },
    );
  }
}

