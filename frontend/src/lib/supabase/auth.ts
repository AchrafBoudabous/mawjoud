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

/** Where a signed-in user may be sent after the link/code. A fixed
 *  allowlist: the `next` value travels in an e-mailed URL, so anything
 *  else would be an open redirect. */
export const AFTER_LOGIN_PATHS = ["/pharmacien", "/admin"] as const;
export type AfterLoginPath = (typeof AFTER_LOGIN_PATHS)[number];

export function safeAfterLogin(value: string | null | undefined): AfterLoginPath {
  return (AFTER_LOGIN_PATHS as readonly string[]).includes(value ?? "")
    ? (value as AfterLoginPath)
    : "/pharmacien";
}

const LAST_EMAIL_KEY = "mawjoud:last-login-email";

/** The address the last link/code was requested for, on THIS device —
 *  lets the validation page offer the 6-digit code when a link fails. */
export function getLastLoginEmail(): string | null {
  try {
    return window.localStorage.getItem(LAST_EMAIL_KEY);
  } catch {
    return null;
  }
}

export async function sendMagicLink(
  email: string,
  options: { createUser: boolean; next?: AfterLoginPath }
): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  try {
    window.localStorage.setItem(LAST_EMAIL_KEY, email);
  } catch {
    /* storage unavailable: the code fallback simply asks for the e-mail */
  }
  const next = options.next ?? "/pharmacien";
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: options.createUser,
      emailRedirectTo: `${window.location.origin}/pharmacien/validation${next === "/pharmacien" ? "" : `?next=${encodeURIComponent(next)}`}`,
    },
  });
  if (error) throw error;
}

export async function verifyEmailCode(email: string, code: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
  if (error) throw error;
}

/** Implicit-flow links (#access_token=…&refresh_token=…) — produced by
 *  some e-mail templates/settings instead of PKCE's ?code=. */
export async function completeFromImplicitTokens(accessToken: string, refreshToken: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
  if (error) throw error;
  window.history.replaceState(null, "", window.location.pathname + window.location.search);
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
  let supabase;
  try {
    supabase = getSupabaseBrowserClient();
  } catch (err) {
    // Misconfiguration is reported by the caller's own getAccessToken();
    // a listener must never crash the page.
    console.error("Supabase auth unavailable:", err);
    return () => {};
  }
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    cb(session !== null);
  });
  return () => subscription.unsubscribe();
}
