import { NextResponse } from "next/server";
import { createDreamFollowUp } from "../../../../lib/dream-follow-up.js";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const body = await request.json();
    const result = await createDreamFollowUp(body);
    return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("POST /api/dreams/follow-up failed", error);
    return NextResponse.json(
      { error: error.message || "目前無法完成這次夢境追問。" },
      { status: 500, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
