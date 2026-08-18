import type { StockStatusView } from "@/lib/api";
import { getDictionary } from "@/lib/i18n";
import { STOCK_STYLES } from "@/lib/stock";

type StockStatusBadgeProps = {
  status: StockStatusView;
};

export function StockStatusBadge({ status }: StockStatusBadgeProps) {
  const dict = getDictionary();

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium transition-colors duration-200 ease-standard ${STOCK_STYLES[status].badge}`}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {dict.stock.status[status]}
    </span>
  );
}
