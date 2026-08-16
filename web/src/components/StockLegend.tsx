import { StockStatusBadge } from "@/components/StockStatusBadge";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { getDictionary } from "@/lib/i18n";
import { STOCK_STATUSES } from "@/lib/stock";

type StockLegendProps = {
  /** A legend line for a badge nobody can see is noise — only rendered
   *  when at least one pharmacy in the current results is verified. */
  showVerified?: boolean;
};

export function StockLegend({ showVerified = false }: StockLegendProps) {
  const dict = getDictionary();

  return (
    <div>
      <h2 className="text-sm font-semibold text-ink">{dict.stock.legendTitle}</h2>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs">
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
    </div>
  );
}
