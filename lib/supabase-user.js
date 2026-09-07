import { createClient } from "@supabase/supabase-js";

export class AuthenticationError extends Error {
  constructor(message = "請先登入 Vela。", code = "AUTH_REQUIRED") {
    super(message);
    this.name = "AuthenticationError";
    this.code = code;
  }
}

function bearerToken(request) {
  const header = String(request.headers.get("authorization") || "");
  const match = header.match(/^Bearer\s+(.+)$/iu);
  const token = match?.[1]?.trim();
  if (!token || token.length > 8192) throw new AuthenticationError();
  return token;
}

export async function getAuthenticatedSupabase(request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !publicKey) {
    throw new AuthenticationError("登入服務尚未完成設定。", "AUTH_NOT_CONFIGURED");
  }

  const token = bearerToken(request);
  const supabase = createClient(url, publicKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user) {
    throw new AuthenticationError("登入狀態已失效，請重新登入。", "AUTH_EXPIRED");
  }

  return { supabase, user: data.user };
}
