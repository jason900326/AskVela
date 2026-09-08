import { NextResponse } from "next/server";
import { DreamOutputError, DreamValidationError, createDreamReading } from "../../../../lib/dream-reading.js";

export const runtime = "nodejs";

function noStoreJson(body, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const reading = await createDreamReading(body);
    return noStoreJson(reading);
  } catch (error) {
    if (error instanceof DreamValidationError) return noStoreJson({ error: error.message, code: error.code }, 400);
    if (error instanceof DreamOutputError) {
      console.error("POST /api/dreams/reading invalid model output", error);
      return noStoreJson({ error: "Vela 這次沒有整理出可顯示的夢境解讀，請沿用同一段夢再試一次。", code: error.code }, 502);
    }
    console.error("POST /api/dreams/reading failed", error);
    return noStoreJson({ error: "目前無法完成夢境解讀，請稍後再試。", code: "DREAM_READING_FAILED" }, 500);
  }
}
