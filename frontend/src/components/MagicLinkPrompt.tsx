"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { sendMagicLink, verifyEmailCode, type AfterLoginPath } from "@/lib/supabase/auth";
import { getDictionary } from "@/lib/i18n";
import { BUTTON_BASE, BUTTON_PRIMARY, BUTTON_QUIET, CARD } from "@/lib/ui";

type MagicLinkPromptProps = {
  email: string;
  /** True when this prompt follows a successful registration — controls
   *  whether a "resend" re-uses shouldCreateUser: true (registration) or
   *  false (login). */
  registered?: boolean;
  /** Where to go once signed in. */
  redirectTo?: AfterLoginPath;
  /** The first e-mail could not be sent: say so, point at "resend". */
  sendFailed?: boolean;
};

type CodePhase = "idle" | "checking" | "error";

/**
 * The single most important piece of UX in step 5: PKCE sign-in only
 * completes in the browser that started it. A pharmacist who requests the
 * link on the pharmacy's desktop and opens their mail on their phone gets
 * permanently stuck without the 6-digit code fallback below.
 * See docs/ARCHITECTURE.md 5.13.3.
 */
export function MagicLinkPrompt({ email, registered = false, redirectTo = "/pharmacien", sendFailed = false }: MagicLinkPromptProps) {
  void registered; // login users are created by the API at registration now
  const dict = getDictionary();
  const router = useRouter();

  const [code, setCode] = useState("");
  const [codePhase, setCodePhase] = useState<CodePhase>("idle");
  const [resent, setResent] = useState(false);

  async function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (codePhase === "checking") return;
    setCodePhase("checking");
    try {
      await verifyEmailCode(email, code.trim());
      router.replace(redirectTo);
    } catch {
      setCodePhase("error");
    }
  }

  async function handleResend() {
    setResent(false);
    try {
      await sendMagicLink(email, { createUser: false, next: redirectTo });
      setResent(true);
    } catch {
      /* silently ignored — the anti-enumeration rule applies here too */
    }
  }

  return (
    <div className={`flex flex-col gap-4 ${CARD} p-4`}>
      <div>
        <h2 className="font-semibold text-ink">{dict.pharmacist.magicLink.sentTitle}</h2>
        <p className="mt-1 text-sm text-muted">{dict.pharmacist.magicLink.sentBody(email)}</p>
        <p className="mt-1 text-xs text-muted">{dict.pharmacist.magicLink.spamHint}</p>
        {sendFailed && (
          <p role="alert" className="mt-2 text-sm font-semibold text-stock-out">
            {dict.pharmacist.magicLink.sendFailed}
          </p>
        )}
      </div>

      <form onSubmit={handleCodeSubmit} className="flex flex-col gap-2">
        <label htmlFor="magic-link-code" className="text-sm font-medium text-ink">
          {dict.pharmacist.magicLink.codeLabel}
        </label>
        <input
          id="magic-link-code"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          // Supabase's code length is configurable (6 by default, up to 10).
          maxLength={10}
          autoComplete="one-time-code"
          autoFocus
          required
          value={code}
          onChange={(e) => {
            setCode(e.target.value.replace(/[^0-9]/g, ""));
            if (codePhase === "error") setCodePhase("idle");
          }}
          className="h-14 max-w-60 rounded-field border border-line bg-surface text-center text-2xl font-bold tracking-[0.35em] tabular-nums focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15"
        />
        {codePhase === "error" && (
          <p role="alert" className="text-sm text-stock-out">
            {dict.pharmacist.magicLink.codeInvalid}
          </p>
        )}
        <button
          type="submit"
          disabled={codePhase === "checking" || code.length < 6}
          className={`${BUTTON_BASE} ${BUTTON_PRIMARY} w-full sm:w-auto`}
        >
          {codePhase === "checking"
            ? dict.pharmacist.magicLink.codeChecking
            : dict.pharmacist.magicLink.codeSubmit}
        </button>
      </form>

      <div>
        <button type="button" onClick={handleResend} className={BUTTON_QUIET}>
          {dict.pharmacist.magicLink.resend}
        </button>
        {resent && (
          <p role="status" className="mt-1 text-xs text-muted">
            {dict.pharmacist.magicLink.resent}
          </p>
        )}
      </div>
    </div>
  );
}
