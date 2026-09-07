import { NextResponse } from "next/server";
import { historyRowsToSnapshot } from "../../../../../lib/reading-history.js";
import {
  AuthenticationError,
  getAuthenticatedSupabase,
} from "../../../../../lib/supabase-user.js";

export const runtime = "nodejs";

function noStoreJson(body, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

function validReadingId(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(String(value || ""));
}

export async function GET(request, context) {
  try {
    const { readingId } = await context.params;
    if (!validReadingId(readingId)) {
      return noStoreJson({ error: "占卜紀錄編號格式不正確。", code: "INVALID_READING_ID" }, 400);
    }
    const { supabase } = await getAuthenticatedSupabase(request);
    const now = new Date().toISOString();
    const [readingResult, cardsResult, messagesResult] = await Promise.all([
      supabase.from("readings").select("*").eq("id", readingId).gt("expires_at", now).maybeSingle(),
      supabase.from("reading_cards").select("*").eq("reading_id", readingId).order("position_index"),
      supabase.from("reading_messages").select("*").eq("reading_id", readingId).order("ordinal"),
    ]);

    if (readingResult.error) throw readingResult.error;
    if (cardsResult.error) throw cardsResult.error;
    if (messagesResult.error) throw messagesResult.error;
    if (!readingResult.data) {
      return noStoreJson({ error: "找不到這筆占卜紀錄。", code: "READING_NOT_FOUND" }, 404);
    }

    return noStoreJson({
      reading: historyRowsToSnapshot(
        readingResult.data,
        cardsResult.data || [],
        messagesResult.data || [],
      ),
    });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return noStoreJson({ error: error.message, code: error.code }, 401);
    }
    console.error("GET /api/readings/history/[readingId] failed", error);
    return noStoreJson(
      { error: "目前無法開啟這次占卜。", code: "READING_HISTORY_DETAIL_FAILED" },
      500,
    );
  }
}

export async function DELETE(request, context) {
  try {
    const { readingId } = await context.params;
    if (!validReadingId(readingId)) {
      return noStoreJson({ error: "占卜紀錄編號格式不正確。", code: "INVALID_READING_ID" }, 400);
    }
    const { supabase } = await getAuthenticatedSupabase(request);
    const { error } = await supabase.from("readings").delete().eq("id", readingId);
    if (error) throw error;
    return noStoreJson({ readingId, deleted: true });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return noStoreJson({ error: error.message, code: error.code }, 401);
    }
    console.error("DELETE /api/readings/history/[readingId] failed", error);
    return noStoreJson(
      { error: "目前無法刪除這次占卜。", code: "READING_HISTORY_DELETE_FAILED" },
      500,
    );
  }
}
