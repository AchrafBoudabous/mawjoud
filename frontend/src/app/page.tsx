import Link from "next/link";
import { Disclaimer } from "@/components/Disclaimer";
import { MedicationSearch } from "@/components/MedicationSearch";
import { PageContainer } from "@/components/PageContainer";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { TrackedMedications } from "@/components/TrackedMedications";
import { EmptyState } from "@/components/ui/EmptyState";
import { BUTTON_BASE, BUTTON_SECONDARY } from "@/lib/ui";
import { getMedications } from "@/lib/api";
import { getDictionary } from "@/lib/i18n";

export const revalidate = 300;

export default async function Home() {
  const dict = getDictionary();

  let medicationsContent: React.ReactNode;

  try {
    const data = await getMedications();
    medicationsContent = <TrackedMedications medications={data.medications} />;
  } catch (error) {
    console.error("Failed to load tracked medications:", error);
    medicationsContent = (
      <EmptyState
        tone="warn"
        role="alert"
        icon="alert"
        title={dict.medications.loadErrorTitle}
        body={dict.medications.loadError}
      />
    );
  }

  return (
    <PageContainer>
      <SiteHeader />

      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink md:text-3xl">
          {dict.home.title}
        </h1>
        <p className="mt-2 text-base text-muted">{dict.common.tagline}</p>
      </header>

      <Disclaimer />

      <MedicationSearch autoFocus />

      {medicationsContent}

      <Link
        href="/pharmacies"
        className={`${BUTTON_BASE} ${BUTTON_SECONDARY} w-full sm:w-auto`}
      >
        {dict.home.ctaPharmacies}
      </Link>

      <SiteFooter />
    </PageContainer>
  );
}
