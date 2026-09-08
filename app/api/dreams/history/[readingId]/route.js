import { NextResponse } from "next/server";
import { dreamHistoryRowToSnapshot } from "../../../../../lib/dream-history.js";
import { AuthenticationError, getAuthenticatedSupabase } from "../../../../../lib/supabase-user.js";

export const runtime = "nodejs";

function noStoreJson(body, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

function validReadingId(value) {
  return /^dream_[0-9a-f]{32}$/u.test(String(value || ""));
}

export async function GET(request, context) {
  try {
    const { readingId } = await context.params;
    if (!validReadingId(readingId)) return noStoreJson({ error: "夢境紀錄編號格式不正確。", code: "INVALID_DREAM_READING_ID" }, 400);

    const { supabase } = await getAuthenticatedSupabase(request);
    const { data, error } = await supabase
      .from("dream_readings")
      .select("*")
      .eq("id", readingId)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (error) throw error;
    if (!data) return noStoreJson({ error: "找不到這筆夢境紀錄。", code: "DREAM_HISTORY_NOT_FOUND" }, 404);
    return noStoreJson({ reading: dreamHistoryRowToSnapshot(data) });
  } catch (error) {
    if (error instanceof AuthenticationError) return noStoreJson({ error: error.message, code: error.code }, 401);
    console.error("GET /api/dreams/history/[readingId] failed", error);
    return noStoreJson({ error: "目前無法開啟這筆夢境紀錄。", code: "DREAM_HISTORY_DETAIL_FAILED" }, 500);
  }
}

export async function DELETE(request, context) {
  try {
    const { readingId } = await context.params;
    if (!validReadingId(readingId)) return noStoreJson({ error: "夢境紀錄編號格式不正確。", code: "INVALID_DREAM_READING_ID" }, 400);
    const { supabase } = await getAuthenticatedSupabase(request);
    const { error } = await supabase.from("dream_readings").delete().eq("id", readingId);
    if (error) throw error;
    return noStoreJson({ readingId, deleted: true });
  } catch (error) {
    if (error instanceof AuthenticationError) return noStoreJson({ error: error.message, code: error.code }, 401);
    console.error("DELETE /api/dreams/history/[readingId] failed", error);
    return noStoreJson({ error: "目前無法刪除這筆夢境紀錄。", code: "DREAM_HISTORY_DELETE_FAILED" }, 500);
  }
}
