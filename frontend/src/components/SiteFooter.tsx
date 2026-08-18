import Link from "next/link";
import { getDictionary } from "@/lib/i18n";

const FOOTER_LINK =
  "inline-flex min-h-11 items-center underline decoration-1 underline-offset-4 transition-colors duration-150 ease-standard hover:text-ink";

export function SiteFooter() {
  const dict = getDictionary();

  return (
    <footer className="mt-auto border-t border-line pt-6 text-xs text-muted">
      <nav aria-label={dict.footer.navLabel} className="flex flex-wrap justify-center gap-x-6">
        <Link href="/pharmacies" className={FOOTER_LINK}>
          {dict.footer.pharmacies}
        </Link>
        <Link href="/pharmacien" className={FOOTER_LINK}>
          {dict.footer.pharmacist}
        </Link>
        <Link href="/statut" className={FOOTER_LINK}>
          {dict.footer.status}
        </Link>
      </nav>
      <p className="mt-2 text-center leading-relaxed">{dict.common.footerNote}</p>
    </footer>
  );
}
