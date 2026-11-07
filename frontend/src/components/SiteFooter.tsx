import Link from "next/link";
import { BrandMark } from "@/components/ui/BrandMark";
import { getDictionary } from "@/lib/i18n";

const FOOTER_LINK =
  "inline-flex min-h-10 items-center text-sm text-ink-soft transition-colors duration-150 ease-standard hover:text-brand-700";

export function SiteFooter() {
  const dict = getDictionary();

  return (
    <footer className="mt-16 border-t border-line bg-surface-2/60">
      <div className="mx-auto grid w-full max-w-wide gap-8 px-4 py-10 md:grid-cols-[1.4fr_1fr] md:px-6">
        <div className="flex max-w-md flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <BrandMark className="size-7" />
            <span className="text-base font-extrabold tracking-tight text-ink">
              {dict.common.appName}
            </span>
          </div>
          <p className="text-sm leading-relaxed text-muted">{dict.footer.about}</p>
        </div>

        <nav aria-label={dict.footer.navLabel} className="flex flex-col gap-0.5 md:items-end">
          <Link href="/" className={FOOTER_LINK}>
            {dict.footer.home}
          </Link>
          <Link href="/pharmacies" className={FOOTER_LINK}>
            {dict.footer.pharmacies}
          </Link>
          <Link href="/observatoire" className={FOOTER_LINK}>
            {dict.footer.observatory}
          </Link>
          <Link href="/pharmacien" className={FOOTER_LINK}>
            {dict.footer.pharmacist}
          </Link>
          <Link href="/statut" className={FOOTER_LINK}>
            {dict.footer.status}
          </Link>
        </nav>
      </div>
      <div className="border-t border-line">
        <p className="mx-auto w-full max-w-wide px-4 py-5 text-xs leading-relaxed text-muted md:px-6">
          {dict.common.footerNote}{" "}
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-line-strong underline-offset-2 hover:text-ink"
          >
            {dict.footer.osm}
          </a>
        </p>
      </div>
    </footer>
  );
}
