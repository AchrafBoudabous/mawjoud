import { Disclaimer } from "@/components/Disclaimer";
import { PageContainer } from "@/components/PageContainer";
import { SearchFieldSkeleton } from "@/components/skeletons/SearchFieldSkeleton";
import { TrackedMedicationsSkeleton } from "@/components/skeletons/TrackedMedicationsSkeleton";
import { Skeleton } from "@/components/ui/Skeleton";
import { getDictionary } from "@/lib/i18n";

export default function Loading() {
  const dict = getDictionary();

  return (
    <PageContainer>

      <header>
        <Skeleton className="h-6 w-3/4 md:h-7" />
        <Skeleton className="mt-2 h-4 w-full" />
      </header>

      <Disclaimer />

      <SearchFieldSkeleton />

      <TrackedMedicationsSkeleton />

      <p role="status" className="sr-only">
        {dict.home.loading}
      </p>

    </PageContainer>
  );
}
