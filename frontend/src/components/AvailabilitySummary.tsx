import type { StockStatusView, StockSummary } from "@/lib/api";
import { getDictionary } from "@/lib/i18n";
import { STOCK_STATUSES } from "@/lib/stock";
import { cn } from "@/lib/utils";

const BAR_COLOR: Record<StockStatusView, string> = {
  in_stock: "bg-stock-in",
  out_of_stock: "bg-stock-out",
  unsure: "bg-stock-unsure",
  none: "bg-line-strong",
};

const DOT_COLOR = BAR_COLOR;

/** At-a-glance answer to "is it anywhere?": a stacked bar across every
 *  pharmacy plus the four counts. The bar is decorative (aria-hidden);
 *  the counts carry the same information as text. */
export function AvailabilitySummary({
  summary,
  total,
  governorateName,
}: {
  summary: StockSummary;
  total: number;
  governorateName: string;
}) {
  const dict = getDictionary();

  return (
    <section
      aria-label={dict.stock.availabilityTitle(governorateName)}
      className="rounded-card border border-line bg-surface p-4 shadow-card md:p-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-sm font-bold text-ink">{dict.stock.availabilityTitle(governorateName)}</h2>
        <p className="text-xs text-muted">{dict.stock.availabilityHint}</p>
      </div>

      <p className="mt-3 text-sm text-ink tabular-nums">
        {dict.stock.summary(summary.in_stock, total)}
      </p>

      <div aria-hidden="true" className="mt-3 flex h-2.5 w-full gap-[2px]">
        {total > 0 &&
          STOCK_STATUSES.map((status) =>
            summary[status] > 0 ? (
              <span
                key={status}
                className={cn(
                  "h-full rounded-full transition-[width] duration-500 ease-standard",
                  BAR_COLOR[status]
                )}
                style={{ width: `${(summary[status] / total) * 100}%` }}
              />
            ) : null
          )}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STOCK_STATUSES.map((status) => (
          <div key={status} className="flex items-center gap-2.5">
            <span aria-hidden="true" className={cn("size-2.5 shrink-0 rounded-full", DOT_COLOR[status])} />
            <div className="flex items-baseline gap-1.5">
              <dd className="text-lg font-extrabold leading-none text-ink tabular-nums">
                {summary[status]}
              </dd>
              <dt className="text-xs text-muted">{dict.stock.summaryShort[status]}</dt>
            </div>
          </div>
        ))}
      </dl>
    </section>
  );
}
