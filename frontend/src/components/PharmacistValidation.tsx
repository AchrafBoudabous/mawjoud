"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { completeMagicLinkSignIn } from "@/lib/supabase/auth";
import { getDictionary } from "@/lib/i18n";
import { BUTTON_QUIET } from "@/lib/ui";

type Phase = "working" | "failed";

/** The PKCE code exchange for a magic-link click. See
 *  docs/ARCHITECTURE.md 5.13.4. Guarded with a ref so React StrictMode's
 *  double-invoke does not attempt the (single-use) exchange twice. */
export function PharmacistValidation() {
  const dict = getDictionary();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [phase, setPhase] = useState<Phase>("working");
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;

    const code = searchParams.get("code");
    const errorParam = searchParams.get("error_description") ?? searchParams.get("error");

    if (errorParam || !code) {
      setPhase("failed");
      return;
    }

    completeMagicLinkSignIn(code)
      .then(() => {
        router.replace("/pharmacien");
      })
      .catch((err) => {
        console.error("completeMagicLinkSignIn failed:", err);
        setPhase("failed");
      });
  }, [router, searchParams]);

  if (phase === "failed") {
    return (
      <div className="flex flex-col gap-3">
        <h1 className="text-xl font-semibold text-ink">{dict.pharmacist.validation.failedTitle}</h1>
        <p role="alert" className="text-sm text-warn-text">
          {dict.pharmacist.validation.failedBody}
        </p>
        <Link href="/pharmacien/connexion" className={BUTTON_QUIET}>
          {dict.pharmacist.validation.retry}
        </Link>
      </div>
    );
  }

  return (
    <div role="status" className="flex items-center justify-center gap-2 py-10">
      <span aria-hidden className="size-2 animate-pulse-soft rounded-full bg-brand-600" />
      <p className="text-sm text-muted">{dict.pharmacist.validation.working}</p>
    </div>
  );
}
