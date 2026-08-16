import type { Metadata } from "next";
import { Suspense } from "react";
import { PharmacistValidation } from "@/components/PharmacistValidation";
import { getDictionary } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Validation de connexion — Mawjoud",
};

function ValidationFallback() {
  const dict = getDictionary();
  return <p className="text-sm text-muted">{dict.pharmacist.validation.working}</p>;
}

export default function PharmacienValidationPage() {
  // useSearchParams() in PharmacistValidation requires this <Suspense>
  // boundary, or Next 15 bails out of static rendering and fails the
  // build. See docs/ARCHITECTURE.md 5.13.4.
  return (
    <Suspense fallback={<ValidationFallback />}>
      <PharmacistValidation />
    </Suspense>
  );
}
