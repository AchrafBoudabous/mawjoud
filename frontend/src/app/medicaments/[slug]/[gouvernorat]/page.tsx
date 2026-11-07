import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Disclaimer } from "@/components/Disclaimer";
import { MedicationSearch } from "@/components/MedicationSearch";
import { PageContainer } from "@/components/PageContainer";
import { SearchEventLogger } from "@/components/SearchEventLogger";
import { ShareButton } from "@/components/ShareButton";
import { StockResults } from "@/components/StockResults";
import { BackLink } from "@/components/ui/BackLink";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import type { MedicationStockResponse } from "@/lib/api";
import { ApiError, getMedicationStock } from "@/lib/api";
import { getDictionary } from "@/lib/i18n";
import { BUTTON_BASE, BUTTON_SECONDARY, EYEBROW } from "@/lib/ui";

export const revalidate = 60;

type PageProps = {
  params: Promise<{ slug: string; gouvernorat: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, gouvernorat } = await params;
  try {
    const data = await getMedicationStock(slug, gouvernorat);
    const title = `${data.medication.name} — ${data.governorate.name_fr} | Mawjoud`;
    const description =
      data.summary.in_stock > 0
        ? `Signalé disponible dans ${data.summary.in_stock} pharmacie(s) du gouvernorat de ${data.governorate.name_fr}. Informations communautaires, non garanties — appelez avant de vous déplacer.`
        : `Disponibilité de ${data.medication.name} dans les pharmacies du gouvernorat de ${data.governorate.name_fr}. Informations communautaires — appelez avant de vous déplacer.`;
    return {
      title,
      description,
      openGraph: { title, description, type: "website", locale: "fr_TN", siteName: "Mawjoud" },
      twitter: { card: "summary_large_image", title, description },
    };
  } catch {
    return { title: "Disponibilité d'un médicament | Mawjoud" };
  }
}

export default async function MedicationGovernoratePage({ params }: PageProps) {
  const { slug, gouvernorat } = await params;
  const dict = getDictionary();

  let data: MedicationStockResponse | null;
  try {
    data = await getMedicationStock(slug, gouvernorat);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    console.error("Failed to load medication stock:", error);
    data = null;
  }

  return (
    <PageContainer width="wide">
      {data && <SearchEventLogger slug={data.medication.slug} governorate={data.governorate.slug} />}
      <div className="grid gap-5 md:grid-cols-[1fr_minmax(0,24rem)] md:items-end">
        <header>
          <BackLink href={`/medicaments/${encodeURIComponent(slug)}`} label={dict.governorate.change} />
          {data && (
            <div className="mt-3 flex items-start gap-4 animate-fade-in-up">
              <span className="flex size-14 shrink-0 items-center justify-center rounded-card bg-brand-600 text-white shadow-[0_10px_24px_-10px_var(--brand-600)] dark:text-brand-50">
                <Icon name={data.medication.category} className="size-7" />
              </span>
              <div className="min-w-0">
                <p className={EYEBROW}>
                  {data.governorate.name_fr} · <span lang="ar">{data.governorate.name_ar}</span>
                </p>
                <h1 className="mt-0.5 text-2xl font-extrabold text-ink md:text-3xl">{data.medication.name}</h1>
                <p className="mt-1 text-base text-muted">
                  {data.medication.generic_name}
                  {data.medication.form ? ` · ${data.medication.form}` : ""}
                </p>
                <ShareButton
                  className="mt-3 min-h-10"
                  medicationName={data.medication.name}
                  governorateName={data.governorate.name_fr}
                  inStockCount={data.summary.in_stock}
                />
              </div>
            </div>
          )}
        </header>

        <MedicationSearch compact />
      </div>

      <Disclaimer />

      {data ? (
        <StockResults pharmacies={data.pharmacies} medication={data.medication} governorate={data.governorate} />
      ) : (
        <EmptyState
          tone="warn"
          role="alert"
          icon="alert"
          title={dict.stock.errorTitle}
          body={dict.stock.error}
          action={
            <a
              href={`/medicaments/${encodeURIComponent(slug)}/${encodeURIComponent(gouvernorat)}`}
              className={`${BUTTON_BASE} ${BUTTON_SECONDARY}`}
            >
              {dict.stock.retry}
            </a>
          }
        />
      )}
    </PageContainer>
  );
}
