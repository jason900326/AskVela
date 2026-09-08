import { NextResponse } from "next/server";
import { ReadingEvidenceError } from "../../../../lib/reading-evidence.js";
import {
  ClarifierMismatchError,
  ClarifierOutputError,
  ClarifierValidationError,
  drawReadingClarifier,
} from "../../../../lib/reading-clarifier.js";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const body = await request.json();
    const result = await drawReadingClarifier(body);
    return NextResponse.json(result, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof ClarifierValidationError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
    }
    if (error instanceof ClarifierMismatchError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 409 });
    }
    if (error instanceof ReadingEvidenceError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 422 });
    }
    if (error instanceof ClarifierOutputError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 502 });
    }

    console.error("/api/readings/clarifier failed", error);
    return NextResponse.json(
      {
        error: "目前無法補抽這張牌；原本的牌面不會改變，可以稍後再試。",
        code: "CLARIFIER_FAILED",
      },
      { status: 500 },
    );
  }
}
