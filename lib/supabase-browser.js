import { createClient } from "@supabase/supabase-js";

let browserClient;

function publicSupabaseKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

export function isSupabaseAuthConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL
      && publicSupabaseKey(),
  );
}

export function getSupabaseBrowser() {
  if (!isSupabaseAuthConfigured()) return null;

  if (!browserClient) {
    browserClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      publicSupabaseKey(),
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storageKey: "vela.auth.v1",
        },
      },
    );
  }

  return browserClient;
}
