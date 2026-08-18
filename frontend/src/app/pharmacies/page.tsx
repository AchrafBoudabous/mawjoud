import type { Metadata } from "next";
import { Disclaimer } from "@/components/Disclaimer";
import { PageContainer } from "@/components/PageContainer";
import { PharmacyDirectory } from "@/components/PharmacyDirectory";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { BackLink } from "@/components/ui/BackLink";
import { EmptyState } from "@/components/ui/EmptyState";
import { BUTTON_BASE, BUTTON_SECONDARY } from "@/lib/ui";
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
      content = (
        <EmptyState icon="pharmacy" title={dict.pharmacies.emptyTitle} body={dict.pharmacies.empty} />
      );
    } else {
      content = <PharmacyDirectory pharmacies={data.pharmacies} />;
    }
  } catch (error) {
    console.error("Failed to load pharmacies:", error);
    content = (
      <EmptyState
        tone="warn"
        role="alert"
        icon="alert"
        title={dict.pharmacies.errorTitle}
        body={dict.pharmacies.error}
        action={
          <a href="/pharmacies" className={`${BUTTON_BASE} ${BUTTON_SECONDARY}`}>
            {dict.pharmacies.retry}
          </a>
        }
      />
    );
  }

  return (
    <PageContainer width="wide">
      <SiteHeader />

      <header>
        <BackLink href="/" label={dict.nav.home} />
        <h1 className="mt-2 text-2xl font-semibold text-ink">{dict.pharmacies.title}</h1>
        <p className="mt-1 text-base text-muted">{dict.pharmacies.subtitle}</p>
      </header>

      <Disclaimer />

      {content}

      <SiteFooter />
    </PageContainer>
  );
}
