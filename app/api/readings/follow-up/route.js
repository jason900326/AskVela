import { NextResponse } from "next/server";
import { ReadingEvidenceError } from "../../../../lib/reading-evidence.js";
import {
  answerReadingFollowUp,
  FollowUpMismatchError,
  FollowUpOutputError,
  FollowUpValidationError,
} from "../../../../lib/reading-follow-up.js";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const body = await request.json();
    const requestId = request.headers.get("Idempotency-Key") || body?.requestId;
    const result = await answerReadingFollowUp({ ...body, requestId });

    return NextResponse.json(result, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof FollowUpValidationError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
    }
    if (error instanceof FollowUpMismatchError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 409 });
    }
    if (error instanceof ReadingEvidenceError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 422 });
    }
    if (error instanceof FollowUpOutputError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 502 });
    }

    console.error("/api/readings/follow-up failed", error);
    return NextResponse.json(
      {
        error: "目前無法完成追問；原本的牌面不會改變，可以稍後沿用同一次占卜再試。",
        code: "FOLLOW_UP_FAILED",
      },
      { status: 500 },
    );
  }
}
