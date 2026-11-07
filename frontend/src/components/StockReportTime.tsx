"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import type { ReportSource } from "@/lib/api";
import { formatAbsoluteDateTime, formatRelativeTime, isStaleReport } from "@/lib/format";
import { getDictionary } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type StockReportTimeProps = {
  iso: string;
  source: ReportSource | null;
};

export function StockReportTime({ iso, source }: StockReportTimeProps) {
  const dict = getDictionary();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    // Keep "il y a 3 minutes" honest on a page left open.
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const when =
    now === null
      ? dict.time.onDate(formatAbsoluteDateTime(iso)) // deterministic SSR text
      : formatRelativeTime(iso, now, dict.time);

  const byPharmacist = source === "pharmacist";
  const sentence = (byPharmacist ? dict.stock.reportedPharmacist : dict.stock.reportedPatient)(when);
  const stale = now !== null && isStaleReport(iso, now);

  return (
    <div>
      <p
        className={cn(
          "inline-flex items-center gap-1.5 text-sm",
          byPharmacist ? "font-semibold text-brand-700" : "text-muted"
        )}
      >
        <Icon name={byPharmacist ? "shield-check" : "clock"} className="size-4 shrink-0" />
        <time dateTime={iso} title={formatAbsoluteDateTime(iso)}>
          {sentence}
        </time>
      </p>
      {stale && (
        <p className="mt-1 inline-flex items-start gap-1.5 text-xs font-medium text-warn-text">
          <Icon name="alert" className="mt-px size-3.5 shrink-0" />
          {dict.stock.staleWarning}
        </p>
      )}
    </div>
  );
}
