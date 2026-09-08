import { NextResponse } from "next/server";
import {
  DREAM_HISTORY_LIMIT,
  DREAM_RETENTION_DAYS,
  DreamHistoryValidationError,
  dreamHistoryRowToSummary,
  normalizeDreamHistorySnapshot,
} from "../../../../lib/dream-history.js";
import { AuthenticationError, getAuthenticatedSupabase } from "../../../../lib/supabase-user.js";

export const runtime = "nodejs";

function noStoreJson(body, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

export async function GET(request) {
  try {
    const { supabase } = await getAuthenticatedSupabase(request);
    const now = new Date().toISOString();
    await supabase.from("dream_readings").delete().lt("expires_at", now);
    const { data, error } = await supabase
      .from("dream_readings")
      .select("id, dream_text, extraction, reading_result, updated_at, expires_at")
      .gt("expires_at", now)
      .order("updated_at", { ascending: false })
      .limit(DREAM_HISTORY_LIMIT);
    if (error) throw error;
    return noStoreJson({ readings: (data || []).map(dreamHistoryRowToSummary) });
  } catch (error) {
    if (error instanceof AuthenticationError) return noStoreJson({ error: error.message, code: error.code }, 401);
    console.error("GET /api/dreams/history failed", error);
    return noStoreJson({ error: "目前無法載入解夢紀錄。", code: "DREAM_HISTORY_LOAD_FAILED" }, 500);
  }
}

export async function POST(request) {
  try {
    const { supabase, user } = await getAuthenticatedSupabase(request);
    const snapshot = normalizeDreamHistorySnapshot(await request.json());
    const now = new Date();
    const expiresAt = new Date(now.getTime() + DREAM_RETENTION_DAYS * 86_400_000).toISOString();
    const { error } = await supabase.from("dream_readings").upsert({
      id: snapshot.readingId,
      user_id: user.id,
      request_id: snapshot.requestId,
      dream_text: snapshot.dreamText,
      waking_life_context: snapshot.wakingLifeContext,
      extraction: snapshot.extraction,
      reading_result: snapshot.result,
      disclaimer: snapshot.disclaimer,
      updated_at: now.toISOString(),
      expires_at: expiresAt,
    }, { onConflict: "id" });
    if (error) throw error;
    return noStoreJson({ readingId: snapshot.readingId, saved: true }, 201);
  } catch (error) {
    if (error instanceof AuthenticationError) return noStoreJson({ error: error.message, code: error.code }, 401);
    if (error instanceof DreamHistoryValidationError) return noStoreJson({ error: error.message, code: error.code }, 400);
    console.error("POST /api/dreams/history failed", error);
    return noStoreJson({ error: "目前無法保存這次解夢。", code: "DREAM_HISTORY_SAVE_FAILED" }, 500);
  }
}

export async function DELETE(request) {
  try {
    const { supabase } = await getAuthenticatedSupabase(request);
    const { error } = await supabase.from("dream_readings").delete().not("id", "is", null);
    if (error) throw error;
    return noStoreJson({ deleted: true });
  } catch (error) {
    if (error instanceof AuthenticationError) return noStoreJson({ error: error.message, code: error.code }, 401);
    console.error("DELETE /api/dreams/history failed", error);
    return noStoreJson({ error: "目前無法清除解夢紀錄。", code: "DREAM_HISTORY_DELETE_FAILED" }, 500);
  }
}
