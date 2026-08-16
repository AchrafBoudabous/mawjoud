import type { Metadata } from "next";
import Link from "next/link";
import { PharmacistNotice } from "@/components/PharmacistNotice";
import { SiteFooter } from "@/components/SiteFooter";
import { getDictionary } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Espace pharmacien — Mawjoud",
  robots: { index: false, follow: false },
};

export default function PharmacienLayout({ children }: { children: React.ReactNode }) {
  const dict = getDictionary();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-screen-sm flex-col gap-6 px-4 py-8">
      <header>
        <Link href="/" className="text-sm text-brand-600 underline">
          {dict.nav.home}
        </Link>
      </header>

      <PharmacistNotice />

      {children}

      <SiteFooter />
    </div>
  );
}
