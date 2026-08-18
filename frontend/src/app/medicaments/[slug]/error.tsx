"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Disclaimer } from "@/components/Disclaimer";
import { PageContainer } from "@/components/PageContainer";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { BUTTON_BASE, BUTTON_PRIMARY, BUTTON_SECONDARY } from "@/lib/ui";
import { getDictionary } from "@/lib/i18n";

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
    <PageContainer width="wide">
      <SiteHeader />
      <Disclaimer />
      <EmptyState
        headingLevel={1}
        tone="warn"
        role="alert"
        icon="alert"
        title={dict.errors.title}
        body={dict.errors.body}
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <button type="button" onClick={reset} className={`${BUTTON_BASE} ${BUTTON_PRIMARY}`}>
              {dict.errors.retry}
            </button>
            <Link href="/" className={`${BUTTON_BASE} ${BUTTON_SECONDARY}`}>
              {dict.errors.backHome}
            </Link>
          </div>
        }
      />
      <SiteFooter />
    </PageContainer>
  );
}
