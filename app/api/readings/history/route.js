import { NextResponse } from "next/server";
import {
  historyRowToSummary,
  normalizeReadingHistorySnapshot,
  READING_HISTORY_LIMIT,
  ReadingHistoryMismatchError,
  ReadingHistoryValidationError,
} from "../../../../lib/reading-history.js";
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

    await supabase.from("readings").delete().lt("expires_at", now);
    const { data, error } = await supabase
      .from("readings")
      .select("id, question, spread_name_zh_tw, reading_result, message_count, created_at, updated_at, expires_at")
      .gt("expires_at", now)
      .order("updated_at", { ascending: false })
      .limit(READING_HISTORY_LIMIT);

    if (error) throw error;
    return noStoreJson({ readings: (data || []).map(historyRowToSummary) });
  } catch (error) {
    if (error instanceof AuthenticationError) return authErrorResponse(error);
    console.error("GET /api/readings/history failed", error);
    return noStoreJson(
      { error: "目前無法載入占卜紀錄。", code: "READING_HISTORY_LOAD_FAILED" },
      500,
    );
  }
}

export async function POST(request) {
  try {
    const { supabase } = await getAuthenticatedSupabase(request);
    const body = await request.json();
    const snapshot = normalizeReadingHistorySnapshot(body);
    const { data, error } = await supabase.rpc("save_reading_history", {
      p_reading: snapshot.reading,
      p_cards: snapshot.cards,
      p_messages: snapshot.messages,
    });

    if (error) throw error;
    return noStoreJson({ readingId: data, saved: true }, 201);
  } catch (error) {
    if (error instanceof AuthenticationError) return authErrorResponse(error);
    if (error instanceof ReadingHistoryValidationError) {
      return noStoreJson({ error: error.message, code: error.code }, 400);
    }
    if (error instanceof ReadingHistoryMismatchError) {
      return noStoreJson({ error: error.message, code: error.code }, 409);
    }
    console.error("POST /api/readings/history failed", error);
    return noStoreJson(
      { error: "目前無法保存這次占卜，內容仍保留在這個瀏覽器。", code: "READING_HISTORY_SAVE_FAILED" },
      500,
    );
  }
}

export async function DELETE(request) {
  try {
    const { supabase } = await getAuthenticatedSupabase(request);
    const { error } = await supabase.from("readings").delete().not("id", "is", null);
    if (error) throw error;
    return noStoreJson({ deleted: true });
  } catch (error) {
    if (error instanceof AuthenticationError) return authErrorResponse(error);
    console.error("DELETE /api/readings/history failed", error);
    return noStoreJson(
      { error: "目前無法清除占卜紀錄。", code: "READING_HISTORY_DELETE_FAILED" },
      500,
    );
  }
}
