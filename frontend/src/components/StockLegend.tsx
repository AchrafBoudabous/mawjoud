"use client";

import { useState } from "react";
import { StockStatusBadge } from "@/components/StockStatusBadge";
import { Icon } from "@/components/ui/Icon";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { getDictionary } from "@/lib/i18n";
import { STOCK_STATUSES } from "@/lib/stock";

type StockLegendProps = {
  /** A legend line for a badge nobody can see is noise — only rendered
   *  when at least one pharmacy in the current results is verified. */
  showVerified?: boolean;
  /** Rendered under the legend list, below md: this is where the
   *  standalone `report.invite` paragraph moved (8.14 b6). */
  footerNote?: string;
};

/** A client component with a disclosure, collapsed by default below md:
 *  and always open from md: — at 360px the legend used to be roughly
 *  eight wrapped lines sitting between the user and the first pharmacy.
 *  See docs/ARCHITECTURE.md 8.14 b5. */
export function StockLegend({ showVerified = false, footerNote }: StockLegendProps) {
  const dict = getDictionary();
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-card border border-line bg-surface shadow-card">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="stock-legend-body"
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-11 w-full items-center justify-between gap-3 px-4 text-sm font-semibold text-ink"
      >
        {dict.stock.legendTitle}
        <Icon
          name="chevron-down"
          className={`size-4 shrink-0 transition-transform duration-150 ease-standard ${open ? "rotate-180" : ""}`}
        />
      </button>
      <div id="stock-legend-body" className={`${open ? "block" : "hidden"} px-4 pb-4`}>
        <ul className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-2">
          {STOCK_STATUSES.map((status) => (
            <li key={status} className="flex items-center gap-2">
              <StockStatusBadge status={status} />
              <span className="text-muted">{dict.stock.legend[status]}</span>
            </li>
          ))}
          {showVerified && (
            <li className="flex items-center gap-2">
              <VerifiedBadge />
              <span className="text-muted">{dict.stock.verifiedLegend}</span>
            </li>
          )}
        </ul>
        {footerNote && <p className="mt-3 border-t border-line pt-3 text-xs text-muted">{footerNote}</p>}
      </div>
    </div>
  );
}
