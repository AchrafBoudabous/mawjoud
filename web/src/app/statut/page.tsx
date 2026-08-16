import type { Metadata } from "next";
import Link from "next/link";
import { ApiStatus } from "@/components/ApiStatus";
import { Disclaimer } from "@/components/Disclaimer";
import { SiteFooter } from "@/components/SiteFooter";
import { getDictionary } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "État des services — Mawjoud",
  description: "Diagnostic technique de la connexion entre le site et le serveur Mawjoud.",
  robots: { index: false },
};

export default function StatutPage() {
  const dict = getDictionary();

  return (
    <div className="mx-auto flex min-h-screen max-w-screen-sm flex-col gap-6 px-4 py-8">
      <header>
        <Link href="/" className="text-sm text-brand-600 underline">
          {dict.nav.home}
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-ink">{dict.apiStatus.title}</h1>
      </header>

      <Disclaimer />

      <ApiStatus />

      <SiteFooter />
    </div>
  );
}
