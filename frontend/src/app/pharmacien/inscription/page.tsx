import type { Metadata } from "next";
import { PharmacistRegistrationForm } from "@/components/PharmacistRegistrationForm";
import { EmptyState } from "@/components/ui/EmptyState";
import { BUTTON_BASE, BUTTON_SECONDARY } from "@/lib/ui";
import { getGovernorates } from "@/lib/api";
import { getDictionary } from "@/lib/i18n";

// Short page window: if the API was asleep when this was (pre)rendered,
// the "indisponible" state must not stick for an hour. Successful API
// responses stay in the data cache for longer (see lib/api.ts).
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Inscrire votre pharmacie — Mawjoud",
};

export default async function PharmacienInscriptionPage() {
  const dict = getDictionary();

  try {
    const data = await getGovernorates();
    return <PharmacistRegistrationForm governorates={data.governorates} />;
  } catch (error) {
    console.error("Failed to load governorates for registration:", error);
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
