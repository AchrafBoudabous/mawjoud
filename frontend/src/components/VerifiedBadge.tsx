import { getDictionary } from "@/lib/i18n";

/** Step 2 §2.8's deferred badge, delivered in step 5. Rendered ONLY when
 *  `verified === true` — there is never an "unverified" counterpart; a
 *  warning on every card would read as "this whole site is untrustworthy".
 *  See docs/ARCHITECTURE.md 5.15.1. */
export function VerifiedBadge() {
  const dict = getDictionary();

  return (
    <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
      <svg
        aria-hidden
        viewBox="0 0 20 20"
        fill="currentColor"
        className="size-3"
      >
        <path
          fillRule="evenodd"
          d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
          clipRule="evenodd"
        />
      </svg>
      {dict.stock.verifiedBadge}
    </span>
  );
}
