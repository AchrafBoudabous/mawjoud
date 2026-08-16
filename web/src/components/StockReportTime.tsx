"use client";

import { useEffect, useState } from "react";
import type { ReportSource } from "@/lib/api";
import { formatAbsoluteDateTime, formatRelativeTime, isStaleReport } from "@/lib/format";
import { getDictionary } from "@/lib/i18n";

type StockReportTimeProps = {
  iso: string;
  source: ReportSource | null;
};

export function StockReportTime({ iso, source }: StockReportTimeProps) {
  const dict = getDictionary();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
  }, []);

  const when =
    now === null
      ? dict.time.onDate(formatAbsoluteDateTime(iso)) // deterministic SSR text
      : formatRelativeTime(iso, now, dict.time);

  const sentence = (
    source === "pharmacist" ? dict.stock.reportedPharmacist : dict.stock.reportedPatient
  )(when);

  const stale = now !== null && isStaleReport(iso, now);

  return (
    <div>
      <p className="text-sm text-muted">
        <time dateTime={iso} title={formatAbsoluteDateTime(iso)}>
          {sentence}
        </time>
      </p>
      {stale && <p className="text-xs text-muted">{dict.stock.staleWarning}</p>}
    </div>
  );
}
