import type { Metadata } from "next";
import Link from "next/link";
import { Disclaimer } from "@/components/Disclaimer";
import { PharmacyDirectory } from "@/components/PharmacyDirectory";
import { SiteFooter } from "@/components/SiteFooter";
import { getPharmacies } from "@/lib/api";
import { getDictionary } from "@/lib/i18n";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Pharmacies de Bizerte — Mawjoud",
  description:
    "Annuaire des pharmacies de la région de Bizerte, avec des informations signalées par la communauté.",
};

export default async function PharmaciesPage() {
  const dict = getDictionary();

  let content: React.ReactNode;

  try {
    const data = await getPharmacies();

    if (data.count === 0) {
      content = <p className="text-muted">{dict.pharmacies.empty}</p>;
    } else {
      content = <PharmacyDirectory pharmacies={data.pharmacies} />;
    }
  } catch (error) {
    console.error("Failed to load pharmacies:", error);
    content = (
      <div>
        <p role="alert" className="text-sm text-warn-text">
          {dict.pharmacies.error}
        </p>
        <a href="/pharmacies" className="mt-2 inline-block text-sm text-brand-600 underline">
          {dict.pharmacies.retry}
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-screen-sm flex-col gap-6 px-4 py-8 md:max-w-6xl">
      <header>
        <Link href="/" className="text-sm text-brand-600 underline">
          {dict.nav.home}
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-ink">{dict.pharmacies.title}</h1>
        <p className="mt-1 text-muted">{dict.pharmacies.subtitle}</p>
      </header>

      <Disclaimer />

      {content}

      <SiteFooter />
    </div>
  );
}
