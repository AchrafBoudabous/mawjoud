import Link from "next/link";
import { getDictionary } from "@/lib/i18n";

export function SiteFooter() {
  const dict = getDictionary();

  return (
    <footer className="mx-auto max-w-screen-sm px-4 py-6 text-center text-xs text-muted">
      <p>{dict.common.footerNote}</p>
      <p className="mt-2 flex justify-center gap-4">
        <Link href="/pharmacies" className="underline hover:text-ink">
          {dict.footer.pharmacies}
        </Link>
        <Link href="/statut" className="underline hover:text-ink">
          {dict.footer.status}
        </Link>
        <Link href="/pharmacien" className="underline hover:text-ink">
          {dict.footer.pharmacist}
        </Link>
      </p>
    </footer>
  );
}
