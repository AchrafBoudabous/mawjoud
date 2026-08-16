import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Disclaimer } from "@/components/Disclaimer";
import { MedicationSearch } from "@/components/MedicationSearch";
import { SearchEventLogger } from "@/components/SearchEventLogger";
import { SiteFooter } from "@/components/SiteFooter";
import { StockResults } from "@/components/StockResults";
import type { MedicationStockResponse } from "@/lib/api";
import { ApiError, getMedicationStock } from "@/lib/api";
import { getDictionary } from "@/lib/i18n";

export const revalidate = 60;

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    const data = await getMedicationStock(slug);
    return {
      title: `${data.medication.name} — disponibilité à Bizerte | Mawjoud`,
      description:
        "Disponibilité signalée par la communauté dans les pharmacies de Bizerte. Informations communautaires, non garanties — appelez avant de vous déplacer.",
    };
  } catch {
    return {
      title: "Disponibilité d'un médicament à Bizerte | Mawjoud",
    };
  }
}

export default async function MedicationPage({ params }: PageProps) {
  const { slug } = await params;
  const dict = getDictionary();

  let data: MedicationStockResponse | null;

  try {
    data = await getMedicationStock(slug);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    console.error("Failed to load medication stock:", error);
    data = null;
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-screen-sm flex-col gap-6 px-4 py-8 md:max-w-6xl">
      {data && <SearchEventLogger slug={data.medication.slug} />}
      <header>
        <Link href="/" className="text-sm text-brand-600 underline">
          {dict.nav.home}
        </Link>
        {data && (
          <>
            <h1 className="mt-2 text-2xl font-bold text-ink">{data.medication.name}</h1>
            <p className="mt-1 text-muted">
              {data.medication.generic_name}
              {data.medication.form ? ` · ${data.medication.form}` : ""}
            </p>
          </>
        )}
      </header>

      <Disclaimer />

      <MedicationSearch compact />

      {data ? (
        <StockResults
          pharmacies={data.pharmacies}
          medicationName={data.medication.name}
          medicationSlug={data.medication.slug}
        />
      ) : (
        <div>
          <p role="alert" className="text-sm text-warn-text">
            {dict.stock.error}
          </p>
          <a
            href={`/medicaments/${slug}`}
            className="mt-2 inline-block text-sm text-brand-600 underline"
          >
            {dict.stock.retry}
          </a>
        </div>
      )}

      <SiteFooter />
    </div>
  );
}
