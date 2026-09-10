import { NextResponse } from "next/server";
import { DeepReadingIntakeError, planDeepReading } from "../../../../lib/deep-reading-intake.js";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const body = await request.json();
    const result = await planDeepReading(body?.question);
    return NextResponse.json(result, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof DeepReadingIntakeError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
    }

    console.error("/api/deep-reading/intake failed", error);
    return NextResponse.json(
      { error: "Vela 現在沒有整理好這個問題，請稍後再試。", code: "DEEP_READING_INTAKE_FAILED" },
      { status: 500 },
    );
  }
}
