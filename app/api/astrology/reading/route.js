import { NextResponse } from "next/server";
import {
  AstrologyOutputError,
  AstrologyValidationError,
  createAstrologyReading,
} from "../../../../lib/astrology-reading.js";

export const runtime = "nodejs";

function noStoreJson(body, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const reading = await createAstrologyReading(body);
    return noStoreJson(reading);
  } catch (error) {
    if (error instanceof AstrologyValidationError) {
      return noStoreJson({ error: error.message, code: error.code }, 400);
    }
    if (error instanceof AstrologyOutputError) {
      console.error("POST /api/astrology/reading invalid model output", error);
      return noStoreJson(
        { error: "Vela 這次沒有整理出可顯示的星座解讀，請沿用同一個選擇再試一次。", code: error.code },
        502,
      );
    }
    console.error("POST /api/astrology/reading failed", error);
    return noStoreJson(
      { error: "目前無法完成星座解讀，請稍後再試。", code: "ASTROLOGY_READING_FAILED" },
      500,
    );
  }
}
