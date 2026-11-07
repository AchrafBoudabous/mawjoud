"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/ui/Icon";
import { BrandMark } from "@/components/ui/BrandMark";
import { getDictionary } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Sticky, translucent top bar on every page. Three destinations only —
 *  the brief's tone rules out heavy chrome. Rendered once, by the root
 *  layout. */
export function SiteHeader() {
  const dict = getDictionary();
  const pathname = usePathname() ?? "/";

  const links: { href: string; label: string; short: string; icon: IconName; active: boolean }[] = [
    {
      href: "/",
      label: dict.header.medications,
      short: dict.header.medicationsShort,
      icon: "search",
      active: pathname === "/" || pathname.startsWith("/medicaments"),
    },
    {
      href: "/pharmacies",
      label: dict.header.pharmacies,
      short: dict.header.pharmacies,
      icon: "map-pin",
      active: pathname.startsWith("/pharmacies"),
    },
    {
      href: "/pharmacien",
      label: dict.header.pharmacist,
      short: dict.header.pharmacistShort,
      icon: "pharmacy",
      active: pathname.startsWith("/pharmacien"),
    },
  ];

  return (
    <header className="sticky top-0 z-[1100] border-b border-line/70 bg-canvas/80 backdrop-blur-xl supports-[backdrop-filter]:bg-canvas/65">
      <div className="mx-auto flex h-16 w-full max-w-wide items-center justify-between gap-3 px-4 md:px-6">
        <Link
          href="/"
          aria-label={dict.common.homeAriaLabel}
          className="group inline-flex min-h-11 items-center gap-2.5 rounded-control"
        >
          <BrandMark className="size-8 shrink-0 transition-transform duration-300 ease-[var(--ease-spring)] group-hover:scale-105" />
          <span className="text-lg font-extrabold tracking-tight text-ink max-[420px]:sr-only">
            {dict.common.appName}
          </span>
        </Link>

        <nav aria-label={dict.header.navLabel}>
          <ul className="flex items-center gap-0.5 sm:gap-1">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={link.active ? "page" : undefined}
                  className={cn(
                    "pressable inline-flex min-h-10 items-center gap-1.5 rounded-full px-2.5 text-[0.8125rem] font-semibold sm:px-3 sm:text-sm",
                    link.active
                      ? "bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200"
                      : "text-ink-soft hover:bg-surface-2 hover:text-ink"
                  )}
                >
                  <Icon name={link.icon} className="size-4 shrink-0 max-sm:hidden" />
                  <span className="sm:hidden">{link.short}</span>
                  <span className="max-sm:hidden">{link.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
