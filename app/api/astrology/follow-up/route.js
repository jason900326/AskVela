import { NextResponse } from "next/server";
import { createAstrologyFollowUp } from "../../../../lib/astrology-follow-up.js";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const body = await request.json();
    const result = await createAstrologyFollowUp(body);
    return NextResponse.json(result, {
      status: 200,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("POST /api/astrology/follow-up failed", error);
    return NextResponse.json(
      { error: error.message || "目前無法接著看這個細節。" },
      { status: 500, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
