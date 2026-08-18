"use client";

import { useEffect } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { BUTTON_BASE, BUTTON_PRIMARY, BUTTON_SECONDARY } from "@/lib/ui";
import { getDictionary } from "@/lib/i18n";

/** Renders inside app/pharmacien/layout.tsx, which already supplies
 *  PageContainer + SiteHeader + PharmacistNotice — no extra shell here,
 *  and deliberately no <Disclaimer /> (decision 5.21.19). Covers all
 *  four /pharmacien* routes. See docs/ARCHITECTURE.md 8.10. */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const dict = getDictionary();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <EmptyState
      headingLevel={1}
      tone="warn"
      role="alert"
      icon="alert"
      title={dict.errors.pharmacistTitle}
      body={dict.errors.pharmacistBody}
      action={
        <div className="flex flex-wrap justify-center gap-3">
          <button type="button" onClick={reset} className={`${BUTTON_BASE} ${BUTTON_PRIMARY}`}>
            {dict.errors.retry}
          </button>
          <Link href="/pharmacien/connexion" className={`${BUTTON_BASE} ${BUTTON_SECONDARY}`}>
            {dict.pharmacist.login.title}
          </Link>
        </div>
      }
    />
  );
}
