import Link from "next/link";
import { Disclaimer } from "@/components/Disclaimer";
import { MedicationSearch } from "@/components/MedicationSearch";
import { SiteFooter } from "@/components/SiteFooter";
import { TrackedMedications } from "@/components/TrackedMedications";
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
    medicationsContent = <p className="text-sm text-muted">{dict.medications.loadError}</p>;
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-screen-sm flex-col gap-6 px-4 py-8">
      <header>
        <h1 className="text-2xl font-bold text-ink">{dict.common.appName}</h1>
        <p className="mt-1 text-muted">{dict.common.tagline}</p>
      </header>

      <Disclaimer />

      <MedicationSearch autoFocus />

      {medicationsContent}

      <Link
        href="/pharmacies"
        className="inline-block text-sm text-brand-600 underline"
      >
        {dict.home.ctaPharmacies}
      </Link>

      <SiteFooter />
    </div>
  );
}
