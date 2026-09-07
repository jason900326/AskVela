import { NextResponse } from "next/server";
import {
  ASTROLOGY_HISTORY_LIMIT,
  ASTROLOGY_RETENTION_DAYS,
  AstrologyHistoryValidationError,
  astrologyHistoryRowToSummary,
  normalizeAstrologyHistorySnapshot,
} from "../../../../lib/astrology-history.js";
import {
  AuthenticationError,
  getAuthenticatedSupabase,
} from "../../../../lib/supabase-user.js";

export const runtime = "nodejs";

function noStoreJson(body, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

function authErrorResponse(error) {
  return noStoreJson({ error: error.message, code: error.code }, 401);
}

export async function GET(request) {
  try {
    const { supabase } = await getAuthenticatedSupabase(request);
    const now = new Date().toISOString();

    await supabase.from("astrology_readings").delete().lt("expires_at", now);
    const { data, error } = await supabase
      .from("astrology_readings")
      .select("id, sign_id, sign_name_zh_tw, period, local_date, reading_result, updated_at, expires_at")
      .gt("expires_at", now)
      .order("updated_at", { ascending: false })
      .limit(ASTROLOGY_HISTORY_LIMIT);

    if (error) throw error;
    return noStoreJson({ readings: (data || []).map(astrologyHistoryRowToSummary) });
  } catch (error) {
    if (error instanceof AuthenticationError) return authErrorResponse(error);
    console.error("GET /api/astrology/history failed", error);
    return noStoreJson(
      { error: "目前無法載入星座紀錄。", code: "ASTROLOGY_HISTORY_LOAD_FAILED" },
      500,
    );
  }
}

export async function POST(request) {
  try {
    const { supabase, user } = await getAuthenticatedSupabase(request);
    const body = await request.json();
    const snapshot = normalizeAstrologyHistorySnapshot(body);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ASTROLOGY_RETENTION_DAYS * 86_400_000).toISOString();

    const { error } = await supabase.from("astrology_readings").upsert({
      id: snapshot.readingId,
      user_id: user.id,
      request_id: snapshot.requestId,
      sign_id: snapshot.sign.id,
      sign_name_zh_tw: snapshot.sign.nameZhTw,
      sign_profile: snapshot.sign,
      period: snapshot.period,
      local_date: snapshot.localDate,
      timezone: snapshot.timezone,
      sky_context: snapshot.skyContext,
      reading_result: snapshot.result,
      disclaimer: snapshot.disclaimer,
      updated_at: now.toISOString(),
      expires_at: expiresAt,
    }, { onConflict: "id" });

    if (error) throw error;
    return noStoreJson({ readingId: snapshot.readingId, saved: true }, 201);
  } catch (error) {
    if (error instanceof AuthenticationError) return authErrorResponse(error);
    if (error instanceof AstrologyHistoryValidationError) {
      return noStoreJson({ error: error.message, code: error.code }, 400);
    }
    console.error("POST /api/astrology/history failed", error);
    return noStoreJson(
      { error: "目前無法保存這次星座解讀，內容仍保留在這個瀏覽器。", code: "ASTROLOGY_HISTORY_SAVE_FAILED" },
      500,
    );
  }
}

export async function DELETE(request) {
  try {
    const { supabase } = await getAuthenticatedSupabase(request);
    const { error } = await supabase.from("astrology_readings").delete().not("id", "is", null);
    if (error) throw error;
    return noStoreJson({ deleted: true });
  } catch (error) {
    if (error instanceof AuthenticationError) return authErrorResponse(error);
    console.error("DELETE /api/astrology/history failed", error);
    return noStoreJson(
      { error: "目前無法清除星座紀錄。", code: "ASTROLOGY_HISTORY_DELETE_FAILED" },
      500,
    );
  }
}
