"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { MagicLinkPrompt } from "@/components/MagicLinkPrompt";
import { getAccessToken, sendMagicLink } from "@/lib/supabase/auth";
import { getDictionary } from "@/lib/i18n";
import { BUTTON_BASE, BUTTON_PRIMARY, FIELD } from "@/lib/ui";

type Phase = "idle" | "sending" | "sent";
type LoginError = "rate_limited" | null;

function isRateLimited(error: unknown): boolean {
  if (error && typeof error === "object") {
    const status = (error as { status?: unknown }).status;
    if (status === 429) return true;
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.toLowerCase().includes("rate limit")) {
      return true;
    }
  }
  return false;
}

export function PharmacistLoginForm() {
  const dict = getDictionary();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<LoginError>(null);

  useEffect(() => {
    let cancelled = false;
    getAccessToken().then((token) => {
      if (!cancelled && token) {
        router.replace("/pharmacien");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (phase === "sending") return;
    setPhase("sending");
    setError(null);

    try {
      await sendMagicLink(email.trim(), { createUser: false });
      setPhase("sent");
    } catch (err) {
      if (isRateLimited(err)) {
        setError("rate_limited");
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
    return <MagicLinkPrompt email={email.trim()} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-ink">{dict.pharmacist.login.title}</h1>
        <p className="mt-1 text-sm text-muted">{dict.pharmacist.login.intro}</p>
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

        {error === "rate_limited" && (
          <p role="alert" className="text-sm text-stock-out">
            {dict.pharmacist.login.rateLimited}
          </p>
        )}

        <button
          type="submit"
          disabled={phase === "sending"}
          className={`${BUTTON_BASE} ${BUTTON_PRIMARY} w-full sm:w-auto`}
        >
          {phase === "sending" ? dict.pharmacist.login.sending : dict.pharmacist.login.submit}
        </button>
      </form>

      <p className="text-sm text-muted">
        {dict.pharmacist.login.noAccount}{" "}
        <Link
          href="/pharmacien/inscription"
          className="text-brand-700 underline decoration-1 underline-offset-4 transition-colors duration-150 ease-standard hover:text-brand-800"
        >
          {dict.pharmacist.login.registerLink}
        </Link>
      </p>
    </div>
  );
}
