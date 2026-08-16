import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/** Browser-only, lazily constructed. NEVER call at module scope: these
 *  modules are imported by Client Components, whose module bodies still
 *  execute during SSR. */
export function getSupabaseBrowserClient(): SupabaseClient {
  if (typeof window === "undefined") {
    throw new Error("getSupabaseBrowserClient() is browser-only.");
  }
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) {
      throw new Error(
        "NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are not configured."
      );
    }
    client = createClient(url, anonKey, {
      auth: {
        flowType: "pkce",
        persistSession: true,
        autoRefreshToken: true,
        // The /pharmacien/validation page exchanges the code explicitly,
        // so auto-detection is off: one deterministic code path, and no
        // race between the SDK and the page's own effect.
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}
