import { NextResponse } from "next/server";
import {
  RETENTION_MAX_TURNS,
  createRetentionContinuation,
  normalizeContinuationTurns,
} from "../../../../lib/retention-continuation.js";
import {
  AuthenticationError,
  getAuthenticatedSupabase,
} from "../../../../lib/supabase-user.js";

export const runtime = "nodejs";

const KINDS = new Set(["tarot", "astrology", "dream"]);

function noStoreJson(body, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

function cleanKind(value) {
  const kind = String(value || "").trim().toLowerCase();
  return KINDS.has(kind) ? kind : "";
}

function cleanReadingId(value) {
  const id = String(value || "").trim();
  if (!id || id.length > 180 || !/^[A-Za-z0-9_-]+$/u.test(id)) return "";
  return id;
}

function authErrorResponse(error) {
  return noStoreJson({ error: error.message, code: error.code }, 401);
}

async function loadSavedReading(supabase, userId, kind, readingId) {
  if (kind === "astrology") {
    const { data, error } = await supabase
      .from("astrology_readings")
      .select("id, user_id, sign_name_zh_tw, period, local_date, sky_context, reading_result")
      .eq("id", readingId)
      .eq("user_id", userId)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  if (kind === "dream") {
    const { data, error } = await supabase
      .from("dream_readings")
      .select("id, user_id, dream_text, waking_life_context, extraction, reading_result")
      .eq("id", readingId)
      .eq("user_id", userId)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  const [readingResult, messagesResult] = await Promise.all([
    supabase
      .from("readings")
      .select("id, user_id, question, spread_name_zh_tw, reading_result")
      .eq("id", readingId)
      .eq("user_id", userId)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle(),
    supabase
      .from("reading_messages")
      .select("ordinal, question, answer, practical_focus")
      .eq("reading_id", readingId)
      .eq("user_id", userId)
      .order("ordinal"),
  ]);
  if (readingResult.error) throw readingResult.error;
  if (messagesResult.error) throw messagesResult.error;
  if (!readingResult.data) return null;
  return {
    ...readingResult.data,
    reading_messages: messagesResult.data || [],
  };
}

async function loadContinuation(supabase, userId, kind, readingId) {
  const { data, error } = await supabase
    .from("reading_continuations")
    .select("turns, updated_at")
    .eq("user_id", userId)
    .eq("kind", kind)
    .eq("reading_id", readingId)
    .maybeSingle();
  if (error) throw error;
  return {
    turns: normalizeContinuationTurns(data?.turns),
    updatedAt: data?.updated_at || null,
  };
}

export async function GET(request) {
  try {
    const { supabase, user } = await getAuthenticatedSupabase(request);
    const url = new URL(request.url);
    const kind = cleanKind(url.searchParams.get("kind"));
    const readingId = cleanReadingId(url.searchParams.get("readingId"));
    if (!kind || !readingId) {
      return noStoreJson({ error: "紀錄參數不完整。", code: "INVALID_RETENTION_TARGET" }, 400);
    }

    // The saved reading is only touched after the user explicitly asks to continue it.
    // RLS plus user_id keeps one account from opening another account's context.
    const savedReading = await loadSavedReading(supabase, user.id, kind, readingId);
    if (!savedReading) {
      return noStoreJson({ error: "找不到這筆已保存的解讀。", code: "RETENTION_READING_NOT_FOUND" }, 404);
    }

    const continuation = await loadContinuation(supabase, user.id, kind, readingId);
    return noStoreJson({
      kind,
      readingId,
      turns: continuation.turns,
      updatedAt: continuation.updatedAt,
      maxTurns: RETENTION_MAX_TURNS,
    });
  } catch (error) {
    if (error instanceof AuthenticationError) return authErrorResponse(error);
    console.error("GET /api/retention/continue failed", error);
    return noStoreJson({ error: "目前無法載入這次延續對話。", code: "RETENTION_LOAD_FAILED" }, 500);
  }
}

export async function POST(request) {
  try {
    const { supabase, user } = await getAuthenticatedSupabase(request);
    const body = await request.json();
    const kind = cleanKind(body?.kind);
    const readingId = cleanReadingId(body?.readingId);
    if (!kind || !readingId) {
      return noStoreJson({ error: "紀錄參數不完整。", code: "INVALID_RETENTION_TARGET" }, 400);
    }

    const savedReading = await loadSavedReading(supabase, user.id, kind, readingId);
    if (!savedReading) {
      return noStoreJson({ error: "找不到這筆已保存的解讀。", code: "RETENTION_READING_NOT_FOUND" }, 404);
    }

    const continuation = await loadContinuation(supabase, user.id, kind, readingId);
    if (continuation.turns.length >= RETENTION_MAX_TURNS) {
      return noStoreJson({ error: "這次先聊到這裡。你可以回到原解讀，或之後用新的閱讀再看看。", code: "RETENTION_TURN_LIMIT" }, 409);
    }

    let turn;
    try {
      turn = await createRetentionContinuation({
        kind,
        snapshot: savedReading,
        turns: continuation.turns,
        message: body?.message,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "目前無法接著回答。";
      const isInput = message.includes("至少再告訴") || message.includes("先聊到這裡");
      return noStoreJson({ error: message, code: isInput ? "INVALID_RETENTION_MESSAGE" : "RETENTION_GENERATION_FAILED" }, isInput ? 400 : 502);
    }

    const nextTurns = [...continuation.turns, turn].slice(-RETENTION_MAX_TURNS);
    const now = new Date().toISOString();
    const { error: saveError } = await supabase
      .from("reading_continuations")
      .upsert({
        user_id: user.id,
        kind,
        reading_id: readingId,
        turns: nextTurns,
        updated_at: now,
      }, { onConflict: "user_id,kind,reading_id" });
    if (saveError) throw saveError;

    return noStoreJson({
      kind,
      readingId,
      turn,
      turns: nextTurns,
      maxTurns: RETENTION_MAX_TURNS,
    }, 201);
  } catch (error) {
    if (error instanceof AuthenticationError) return authErrorResponse(error);
    console.error("POST /api/retention/continue failed", error);
    return noStoreJson({ error: "目前無法把這次對話接下去。", code: "RETENTION_CONTINUE_FAILED" }, 500);
  }
}
