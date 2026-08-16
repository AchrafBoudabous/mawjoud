import type { Metadata } from "next";
import { PharmacistRegistrationForm } from "@/components/PharmacistRegistrationForm";
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
      <div>
        <p role="alert" className="text-sm text-warn-text">
          {dict.pharmacies.error}
        </p>
        <a
          href="/pharmacien/inscription"
          className="mt-2 inline-block text-sm text-brand-600 underline"
        >
          {dict.pharmacies.retry}
        </a>
      </div>
    );
  }
}
