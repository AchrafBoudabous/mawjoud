/**
 * The ONLY module in this project that touches the Supabase SDK. Every
 * other file — including frontend/src/lib/api.ts, which remains the sole path
 * to FastAPI — talks to this one. That keeps the "browser calls Supabase
 * Auth (/auth/v1/*) and nothing else" invariant enforceable by reading a
 * single file. See docs/ARCHITECTURE.md 5.0, 5.11, 5.21.2.
 *
 * No component may import @supabase/supabase-js directly. No `.from()`,
 * `.rpc()`, `.channel()` or `.storage` call exists anywhere in this repo.
 */
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export async function sendMagicLink(
  email: string,
  options: { createUser: boolean }
): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: options.createUser,
      emailRedirectTo: `${window.location.origin}/pharmacien/validation`,
    },
  });
  if (error) throw error;
}

export async function verifyEmailCode(email: string, code: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
  if (error) throw error;
}

export async function completeMagicLinkSignIn(code: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) throw error;
}

/** getSession() every time — never cache. getSession() refreshes a token
 *  that is near expiry, which is what keeps a dashboard left open on a
 *  pharmacy counter all day from silently 401-ing. */
export async function getAccessToken(): Promise<string | null> {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function getSessionEmail(): Promise<string | null> {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.email ?? null;
}

export async function signOutPharmacist(): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  await supabase.auth.signOut();
}

export function onAuthChange(cb: (signedIn: boolean) => void): () => void {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    cb(session !== null);
  });
  return () => subscription.unsubscribe();
}
