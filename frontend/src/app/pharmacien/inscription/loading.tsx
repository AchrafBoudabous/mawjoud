import { RegistrationFormSkeleton } from "@/components/skeletons/RegistrationFormSkeleton";
import { getDictionary } from "@/lib/i18n";

/** The pharmacist layout already supplies PageContainer, SiteHeader and
 *  <PharmacistNotice /> — only the form itself needs a skeleton here. */
export default function Loading() {
  const dict = getDictionary();

  return (
    <>
      <RegistrationFormSkeleton />
      <p role="status" className="sr-only">
        {dict.pharmacist.register.loading}
      </p>
    </>
  );
}
