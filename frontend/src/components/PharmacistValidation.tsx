"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { MagicLinkPrompt } from "@/components/MagicLinkPrompt";
import {
  completeFromImplicitTokens,
  completeMagicLinkSignIn,
  getLastLoginEmail,
  safeAfterLogin,
} from "@/lib/supabase/auth";
import { getDictionary } from "@/lib/i18n";
import { BUTTON_QUIET } from "@/lib/ui";

type FailReason = "other_browser" | "expired" | "no_code" | "other";
type Phase = { kind: "working" } | { kind: "failed"; reason: FailReason; detail: string | null };

/** Turn whatever Supabase / supabase-js reported into one of four
 *  explanations a pharmacist (or admin) can act on. */
function classify(detail: string): FailReason {
  const d = detail.toLowerCase();
  if (d.includes("code verifier") || d.includes("pkce") || d.includes("both auth code and code verifier")) {
    return "other_browser";
  }
  if (d.includes("expired") || d.includes("otp_expired") || d.includes("invalid flow state") || d.includes("already")) {
    return "expired";
  }
  return "other";
}

/**
 * Completes a magic-link sign-in. Handles the normal PKCE `?code=` and,
 * defensively, the implicit `#access_token=` form (some e-mail templates
 * or project settings produce it). On failure it says WHY, and offers the
 * 6-digit code from the same e-mail — which works in any browser and is
 * immune to security scanners that "click" links before the user does.
 * Guarded with a ref so StrictMode's double-invoke cannot spend the
 * single-use code twice.
 */
export function PharmacistValidation() {
  const dict = getDictionary();
  const t = dict.pharmacist.validation;
  const router = useRouter();
  const searchParams = useSearchParams();

  const [phase, setPhase] = useState<Phase>({ kind: "working" });
  const [lastEmail, setLastEmail] = useState<string | null>(null);
  const attempted = useRef(false);
  const next = safeAfterLogin(searchParams.get("next"));

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;
    setLastEmail(getLastLoginEmail());

    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const fail = (detail: string | null, reason?: FailReason) =>
      setPhase({ kind: "failed", reason: reason ?? classify(detail ?? ""), detail });

    const errorParam =
      searchParams.get("error_description") ?? hash.get("error_description") ??
      searchParams.get("error_code") ?? hash.get("error_code") ??
      searchParams.get("error") ?? hash.get("error");
    if (errorParam) {
      fail(errorParam);
      return;
    }

    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");
    if (accessToken && refreshToken) {
      completeFromImplicitTokens(accessToken, refreshToken)
        .then(() => router.replace(next))
        .catch((err: unknown) => fail(err instanceof Error ? err.message : String(err)));
      return;
    }

    const code = searchParams.get("code");
    if (!code) {
      fail(null, "no_code");
      return;
    }

    completeMagicLinkSignIn(code)
      .then(() => router.replace(next))
      .catch((err: unknown) => {
        console.error("completeMagicLinkSignIn failed:", err);
        const name = err instanceof Error ? err.name : "";
        fail(`${name} ${err instanceof Error ? err.message : String(err)}`.trim());
      });
  }, [router, searchParams, next]);

  if (phase.kind === "failed") {
    const loginHref = next === "/admin" ? "/admin" : "/pharmacien/connexion";
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-extrabold text-ink">{t.failedTitle}</h1>
          <p role="alert" className="text-sm text-warn-text">{t.reasons[phase.reason]}</p>
          {phase.detail && (
            <p className="text-xs text-muted">
              {t.technical} <code className="break-all">{phase.detail}</code>
            </p>
          )}
        </div>

        {lastEmail ? (
          <>
            <p className="text-sm font-semibold text-ink">{t.useCode}</p>
            <MagicLinkPrompt email={lastEmail} redirectTo={next} />
          </>
        ) : (
          <Link href={loginHref} className={BUTTON_QUIET}>
            {t.retry}
          </Link>
        )}
      </div>
    );
  }

  return (
    <div role="status" className="flex items-center justify-center gap-2 py-10">
      <span aria-hidden className="size-2 animate-pulse-soft rounded-full bg-brand-600" />
      <p className="text-sm text-muted">{t.working}</p>
    </div>
  );
}
