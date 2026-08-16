import { ApiError } from "@/lib/api";
import type { StockStatusView } from "@/lib/api";

export const STOCK_STATUSES = [
  "in_stock",
  "out_of_stock",
  "unsure",
  "none",
] as const satisfies readonly StockStatusView[];

/**
 * Class strings must be written out literally — Tailwind v4 scans source
 * text and will not see a class name assembled at runtime.
 * `pin` mirrors the --color-stock-* foreground tokens in globals.css
 * because it goes into an SVG string, not a class. Keep the two in sync.
 */
export const STOCK_STYLES: Record<StockStatusView, { badge: string; pin: string }> = {
  in_stock: { badge: "bg-stock-in-bg text-stock-in", pin: "#15803d" },
  out_of_stock: { badge: "bg-stock-out-bg text-stock-out", pin: "#b91c1c" },
  unsure: { badge: "bg-stock-unsure-bg text-stock-unsure", pin: "#b45309" },
  none: { badge: "bg-stock-none-bg text-stock-none", pin: "#4b5563" },
};

/** A report older than this is flagged as stale in the UI. */
export const STALE_AFTER_HOURS = 72;

export type ReportErrorKind = "rate_limited" | "not_found" | "network" | "generic";

export function classifyReportError(error: unknown): ReportErrorKind {
  if (error instanceof ApiError) {
    if (error.status === 429) return "rate_limited";
    if (error.status === 404) return "not_found";
    return "generic"; // 422, 500, 503, anything else
  }
  return "network"; // fetch rejection, timeout, offline
}

/** How long the browser waits before telling the user the free-tier
 *  server may be waking up. Mirrors step 1's apiStatus.coldStart. */
export const REPORT_SLOW_AFTER_MS = 6_000;
