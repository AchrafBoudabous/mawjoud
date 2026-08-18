import type { Metadata } from "next";
import { PharmacistRegistrationForm } from "@/components/PharmacistRegistrationForm";
import { EmptyState } from "@/components/ui/EmptyState";
import { BUTTON_BASE, BUTTON_SECONDARY } from "@/lib/ui";
import { getPharmacies } from "@/lib/api";
import { getDictionary } from "@/lib/i18n";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Inscrire votre pharmacie — Mawjoud",
};

export default async function PharmacienInscriptionPage() {
  const dict = getDictionary();

  try {
    const data = await getPharmacies();
    return <PharmacistRegistrationForm pharmacies={data.pharmacies} />;
  } catch (error) {
    console.error("Failed to load pharmacies for registration:", error);
    return (
      <EmptyState
        tone="warn"
        role="alert"
        icon="alert"
        title={dict.pharmacies.errorTitle}
        body={dict.pharmacies.error}
        action={
          <a href="/pharmacien/inscription" className={`${BUTTON_BASE} ${BUTTON_SECONDARY}`}>
            {dict.pharmacies.retry}
          </a>
        }
      />
    );
  }
}
