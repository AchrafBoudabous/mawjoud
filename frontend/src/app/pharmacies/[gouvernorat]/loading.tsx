import { Disclaimer } from "@/components/Disclaimer";
import { PageContainer } from "@/components/PageContainer";
import { PharmacyCardSkeleton } from "@/components/skeletons/PharmacyCardSkeleton";
import { BackLink } from "@/components/ui/BackLink";
import { Skeleton } from "@/components/ui/Skeleton";
import { getDictionary } from "@/lib/i18n";

export default function Loading() {
  const dict = getDictionary();

  return (
    <PageContainer width="wide">

      <header>
        <BackLink href="/pharmacies" label={dict.governorate.change} />
        <Skeleton className="mt-2 h-6 w-2/5" />
      </header>

      <Disclaimer />

      <Skeleton className="h-11 w-full md:hidden" />
      <Skeleton className="h-3.5 w-1/3" />

      <div className="flex flex-col gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <PharmacyCardSkeleton key={i} />
        ))}
      </div>

      <p role="status" className="sr-only">
        {dict.pharmacies.loading}
      </p>

    </PageContainer>
  );
}
