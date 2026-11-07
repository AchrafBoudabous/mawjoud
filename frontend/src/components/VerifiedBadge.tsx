import { Icon } from "@/components/ui/Icon";
import { getDictionary } from "@/lib/i18n";

/** Rendered ONLY when `verified === true` — there is never an
 *  "unverified" counterpart; a warning on every card would read as "this
 *  whole site is untrustworthy". */
export function VerifiedBadge() {
  const dict = getDictionary();

  return (
    <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700 ring-1 ring-inset ring-brand-200">
      <Icon name="verified" className="size-3.5" strokeWidth={2.2} />
      {dict.stock.verifiedBadge}
    </span>
  );
}
