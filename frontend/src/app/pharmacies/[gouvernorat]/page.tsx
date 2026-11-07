import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Disclaimer } from "@/components/Disclaimer";
import { PageContainer } from "@/components/PageContainer";
import { PharmacyDirectory } from "@/components/PharmacyDirectory";
import { BackLink } from "@/components/ui/BackLink";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Governorate, PharmacyListResponse } from "@/lib/api";
import { getGovernorates, getPharmacies } from "@/lib/api";
import { getDictionary } from "@/lib/i18n";
import { BUTTON_BASE, BUTTON_SECONDARY } from "@/lib/ui";

export const revalidate = 120;

type PageProps = { params: Promise<{ gouvernorat: string }> };

async function findGovernorate(slug: string): Promise<Governorate | null | "error"> {
  try {
    const { governorates } = await getGovernorates();
    return governorates.find((g) => g.slug === slug) ?? null;
  } catch {
    return "error";
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { gouvernorat } = await params;
  const gov = await findGovernorate(gouvernorat);
  const name = gov && gov !== "error" ? gov.name_fr : "Tunisie";
  return {
    title: `Pharmacies — ${name} | Mawjoud`,
    description: `Pharmacies du gouvernorat de ${name} : téléphone, pharmacies de garde et de nuit. Informations communautaires — appelez avant de vous déplacer.`,
  };
}

export default async function GovernoratePharmaciesPage({ params }: PageProps) {
  const { gouvernorat } = await params;
  const dict = getDictionary();

  const gov = await findGovernorate(gouvernorat);
  if (gov === null) notFound();

  let data: PharmacyListResponse | null = null;
  if (gov !== "error") {
    try {
      data = await getPharmacies(gov.slug);
    } catch (error) {
      console.error("Failed to load pharmacies:", error);
    }
  }

  const name = gov !== "error" ? gov.name_fr : "";

  return (
    <PageContainer width="wide">
      <header>
        <BackLink href="/pharmacies" label={dict.governorate.change} />
        <h1 className="mt-2 text-2xl font-extrabold text-ink md:text-3xl">
          {dict.pharmacies.governorateTitle(name)}
          {gov !== "error" && (
            <span lang="ar" className="ms-3 text-xl font-semibold text-muted">
              {gov.name_ar}
            </span>
          )}
        </h1>
        <p className="mt-1 text-base text-muted">{dict.pharmacies.governorateSubtitle}</p>
      </header>

      <Disclaimer />

      {gov !== "error" && data ? (
        data.count === 0 ? (
          <EmptyState icon="pharmacy" title={dict.pharmacies.emptyTitle} body={dict.pharmacies.osmNote} />
        ) : (
          <>
            <PharmacyDirectory pharmacies={data.pharmacies} governorate={gov} />
            <p className="text-xs text-muted">{dict.pharmacies.osmNote}</p>
          </>
        )
      ) : (
        <EmptyState
          tone="warn"
          role="alert"
          icon="alert"
          title={dict.pharmacies.errorTitle}
          body={dict.pharmacies.error}
          action={
            <a href={`/pharmacies/${encodeURIComponent(gouvernorat)}`} className={`${BUTTON_BASE} ${BUTTON_SECONDARY}`}>
              {dict.pharmacies.retry}
            </a>
          }
        />
      )}
    </PageContainer>
  );
}
