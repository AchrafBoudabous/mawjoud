import Link from "next/link";
import { BrandMark } from "@/components/ui/BrandMark";
import { getDictionary } from "@/lib/i18n";

/** A wordmark on every page, including /pharmacien*. No navigation bar, no
 *  hamburger, no sticky header — the footer already carries the three
 *  secondary links and the brief's tone rules out chrome. See
 *  docs/ARCHITECTURE.md 8.5. */
export function SiteHeader() {
  const dict = getDictionary();

  return (
    <Link
      href="/"
      aria-label={dict.common.homeAriaLabel}
      className="inline-flex min-h-11 items-center gap-2 self-start rounded-control text-brand-700 transition-colors duration-150 ease-standard hover:text-brand-800"
    >
      <BrandMark className="size-5 shrink-0" />
      <span className="text-sm font-semibold uppercase tracking-[0.06em]">
        {dict.common.appName}
      </span>
    </Link>
  );
}
