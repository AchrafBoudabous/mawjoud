import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Disclaimer } from "@/components/Disclaimer";
import { MedicationSearch } from "@/components/MedicationSearch";
import { PageContainer } from "@/components/PageContainer";
import { SearchEventLogger } from "@/components/SearchEventLogger";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { StockResults } from "@/components/StockResults";
import { BackLink } from "@/components/ui/BackLink";
import { EmptyState } from "@/components/ui/EmptyState";
import { BUTTON_BASE, BUTTON_SECONDARY } from "@/lib/ui";
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
    <PageContainer width="wide">
      {data && <SearchEventLogger slug={data.medication.slug} />}
      <SiteHeader />
      <header>
        <BackLink href="/" label={dict.nav.home} />
        {data && (
          <>
            <h1 className="mt-2 text-2xl font-semibold text-ink">{data.medication.name}</h1>
            <p className="mt-1 text-base text-muted">
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
        <EmptyState
          tone="warn"
          role="alert"
          icon="alert"
          title={dict.stock.errorTitle}
          body={dict.stock.error}
          action={
            <a href={`/medicaments/${slug}`} className={`${BUTTON_BASE} ${BUTTON_SECONDARY}`}>
              {dict.stock.retry}
            </a>
          }
        />
      )}

      <SiteFooter />
    </PageContainer>
  );
}
