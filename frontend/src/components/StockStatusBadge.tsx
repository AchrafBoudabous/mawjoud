import { Icon, type IconName } from "@/components/ui/Icon";
import type { StockStatusView } from "@/lib/api";
import { getDictionary } from "@/lib/i18n";
import { STOCK_STYLES } from "@/lib/stock";
import { cn } from "@/lib/utils";

type StockStatusBadgeProps = {
  status: StockStatusView;
  size?: "sm" | "md";
};

const STATUS_ICON: Record<StockStatusView, IconName> = {
  in_stock: "check-circle",
  out_of_stock: "x-circle",
  unsure: "help-circle",
  none: "clock",
};

/** Colour is never the only signal: every state also carries its own
 *  glyph and its French label (colour-blind safe). */
export function StockStatusBadge({ status, size = "md" }: StockStatusBadgeProps) {
  const dict = getDictionary();

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full font-semibold ring-1 ring-inset ring-current/15 transition-colors duration-200 ease-standard",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs",
        STOCK_STYLES[status].badge
      )}
    >
      <Icon name={STATUS_ICON[status]} className="size-3.5" strokeWidth={2.2} />
      {dict.stock.status[status]}
    </span>
  );
}
