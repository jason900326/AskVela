import { NextResponse } from "next/server";
import {
  AuthenticationError,
  getAuthenticatedSupabase,
} from "../../../lib/supabase-user.js";

export const runtime = "nodejs";

const TABLE = "deep_reading_trials";

function cleanIdentifier(value, label, max = 200) {
  const text = String(value || "").trim();
  if (text.length < 8 || text.length > max) {
    const error = new Error(`${label}格式不正確。`);
    error.code = "INVALID_TRIAL_REQUEST";
    throw error;
  }
  return text;
}

function trialPayload(row) {
  if (!row) return { status: "available", eligible: true, claim: null };
  return {
    status: "claimed",
    eligible: false,
    claim: {
      readingId: row.reading_id,
      requestId: row.request_id,
      claimedAt: row.claimed_at,
    },
  };
}

async function ownClaim(supabase, userId) {
  const { data, error } = await supabase
    .from(TABLE)
    .select("user_id, reading_id, request_id, claimed_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

export async function GET(request) {
  try {
    const { supabase, user } = await getAuthenticatedSupabase(request);
    const claim = await ownClaim(supabase, user.id);
    return NextResponse.json(trialPayload(claim), {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 401 });
    }
    console.error("/api/deep-trial GET failed", error);
    return NextResponse.json({ error: "目前無法確認免費深度解析資格。" }, { status: 500 });
  }
}

async function claimTrial(supabase, user, body) {
  const readingId = cleanIdentifier(body?.readingId, "readingId", 180);
  const requestId = cleanIdentifier(body?.requestId, "requestId", 200);
  const existing = await ownClaim(supabase, user.id);

  if (existing) {
    const sameReading = existing.reading_id === readingId && existing.request_id === requestId;
    if (sameReading) {
      return NextResponse.json({ allowed: true, resumed: true, ...trialPayload(existing) }, {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      });
    }
    return NextResponse.json({ allowed: false, reason: "TRIAL_ALREADY_USED", ...trialPayload(existing) }, {
      status: 409,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      user_id: user.id,
      reading_id: readingId,
      request_id: requestId,
      status: "claimed",
      claimed_at: now,
      updated_at: now,
    })
    .select("user_id, reading_id, request_id, claimed_at")
    .single();

  if (!error) {
    return NextResponse.json({ allowed: true, resumed: false, ...trialPayload(data) }, {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  }

  // Two tabs can race the first insert. The user_id primary key is the atomic
  // arbiter; after a conflict only the exact same reading may resume.
  if (error.code === "23505") {
    const winner = await ownClaim(supabase, user.id);
    const sameReading = winner?.reading_id === readingId && winner?.request_id === requestId;
    if (sameReading) {
      return NextResponse.json({ allowed: true, resumed: true, ...trialPayload(winner) }, {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      });
    }
    return NextResponse.json({ allowed: false, reason: "TRIAL_ALREADY_USED", ...trialPayload(winner) }, {
      status: 409,
      headers: { "Cache-Control": "no-store" },
    });
  }

  throw error;
}

export async function POST(request) {
  try {
    const { supabase, user } = await getAuthenticatedSupabase(request);
    const body = await request.json();
    const action = String(body?.action || "claim");

    if (action !== "claim") {
      return NextResponse.json({ error: "不支援的試用操作。", code: "INVALID_TRIAL_ACTION" }, { status: 400 });
    }
    return claimTrial(supabase, user, body);
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 401 });
    }
    if (error?.code === "INVALID_TRIAL_REQUEST") {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
    }
    console.error("/api/deep-trial POST failed", error);
    return NextResponse.json({ error: "目前無法更新免費深度解析資格。" }, { status: 500 });
  }
}
