"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { MagicLinkPrompt } from "@/components/MagicLinkPrompt";
import { getAccessToken, sendMagicLink, type AfterLoginPath } from "@/lib/supabase/auth";
import { getDictionary } from "@/lib/i18n";
import { BUTTON_BASE, BUTTON_PRIMARY, BUTTON_QUIET, FIELD } from "@/lib/ui";

type Phase = "idle" | "sending" | "sent";
/** Supabase has two limits: a short per-address wait ("you can only
 *  request this after N seconds") and an hourly cap on e-mails for the
 *  whole project ("email rate limit exceeded"). */
type LoginError = { kind: "wait"; seconds: number } | { kind: "hourly" } | null;

function classifyRateLimit(error: unknown): LoginError {
  if (!error || typeof error !== "object") return null;
  const status = (error as { status?: unknown }).status;
  const message = String((error as { message?: unknown }).message ?? "");
  const code = String((error as { code?: unknown }).code ?? "");
  const wait = message.match(/after (\d+) seconds?/i);
  if (wait) return { kind: "wait", seconds: Number(wait[1]) };
  if (status === 429 || /rate limit/i.test(message) || code.startsWith("over_")) return { kind: "hourly" };
  return null;
}

type PharmacistLoginFormProps = {
  /** Reused by /admin: same e-mail link/code, different destination. */
  redirectTo?: AfterLoginPath;
  title?: string;
  intro?: string;
  showRegisterLink?: boolean;
};

export function PharmacistLoginForm({
  redirectTo = "/pharmacien",
  title,
  intro,
  showRegisterLink = true,
}: PharmacistLoginFormProps = {}) {
  const dict = getDictionary();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<LoginError>(null);

  // Count the short wait down so the button re-enables by itself.
  useEffect(() => {
    if (error?.kind !== "wait" || error.seconds <= 0) return;
    const id = setTimeout(
      () => setError((e) => (e?.kind === "wait" ? (e.seconds <= 1 ? null : { kind: "wait", seconds: e.seconds - 1 }) : e)),
      1000
    );
    return () => clearTimeout(id);
  }, [error]);

  useEffect(() => {
    let cancelled = false;
    getAccessToken()
      .then((token) => {
        if (!cancelled && token) {
          router.replace(redirectTo);
        }
      })
      .catch((err: unknown) => {
        // e.g. misconfigured NEXT_PUBLIC_SUPABASE_* — the form still
        // renders; submitting surfaces the problem in the console.
        console.error("Could not read the pharmacist session:", err);
      });
    return () => {
      cancelled = true;
    };
  }, [router, redirectTo]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (phase === "sending") return;
    setPhase("sending");
    setError(null);

    try {
      await sendMagicLink(email.trim(), { createUser: false, next: redirectTo });
      setPhase("sent");
    } catch (err) {
      const limited = classifyRateLimit(err);
      if (limited) {
        console.error("sendMagicLink rate-limited:", err);
        setError(limited);
        setPhase("idle");
        return;
      }
      // Anti-enumeration: an "unknown e-mail" (or any other) error from
      // GoTrue must never be surfaced. Log it and behave as if it sent.
      console.error("sendMagicLink failed:", err);
      setPhase("sent");
    }
  }

  if (phase === "sent") {
    return <MagicLinkPrompt email={email.trim()} redirectTo={redirectTo} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-extrabold text-ink md:text-3xl">{title ?? dict.pharmacist.login.title}</h1>
        <p className="mt-1 text-sm text-muted">{intro ?? dict.pharmacist.login.intro}</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label htmlFor="login-email" className="text-sm font-medium text-ink">
          {dict.pharmacist.login.emailLabel}
        </label>
        <input
          id="login-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={FIELD}
        />

        {error && (
          <p role="alert" className="text-sm text-stock-out">
            {error.kind === "wait"
              ? dict.pharmacist.login.rateLimitedWait(error.seconds)
              : dict.pharmacist.login.rateLimitedHourly}
          </p>
        )}

        <button
          type="submit"
          disabled={phase === "sending" || error?.kind === "wait"}
          className={`${BUTTON_BASE} ${BUTTON_PRIMARY} w-full sm:w-auto`}
        >
          {phase === "sending" ? dict.pharmacist.login.sending : dict.pharmacist.login.submit}
        </button>
        {/* A code stays valid for an hour: no need to request another
            e-mail (and spend the quota) to use one already received. */}
        <button
          type="button"
          disabled={!email.trim()}
          onClick={() => setPhase("sent")}
          className={`${BUTTON_QUIET} self-start disabled:opacity-50`}
        >
          {dict.pharmacist.login.haveCode}
        </button>
      </form>

      {showRegisterLink && (
      <p className="text-sm text-muted">
        {dict.pharmacist.login.noAccount}{" "}
        <Link
          href="/pharmacien/inscription"
          className="text-brand-700 underline decoration-1 underline-offset-4 transition-colors duration-150 ease-standard hover:text-brand-800"
        >
          {dict.pharmacist.login.registerLink}
        </Link>
      </p>
      )}
    </div>
  );
}
