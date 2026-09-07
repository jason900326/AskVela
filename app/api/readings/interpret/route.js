import { NextResponse } from "next/server";
import { DrawValidationError } from "../../../../lib/tarot-draw.js";
import { ReadingEvidenceError } from "../../../../lib/reading-evidence.js";
import {
  interpretTarotReading,
  ReadingMismatchError,
} from "../../../../lib/reading-interpreter.js";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const body = await request.json();
    const requestId = request.headers.get("Idempotency-Key") || body?.requestId;
    const result = await interpretTarotReading({
      question: body?.question,
      spreadId: body?.spreadId,
      requestId,
      readingId: body?.readingId,
    });

    return NextResponse.json(result, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof DrawValidationError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
    }
    if (error instanceof ReadingMismatchError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 409 });
    }
    if (error instanceof ReadingEvidenceError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 422 });
    }

    console.error("/api/readings/interpret failed", error);
    return NextResponse.json(
      { error: "目前無法完成解讀；原本的抽牌結果不會改變，請沿用同一個 requestId 重試。", code: "INTERPRETATION_FAILED" },
      { status: 500 },
    );
  }
}

