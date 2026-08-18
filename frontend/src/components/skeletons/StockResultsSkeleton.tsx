import { MapSkeleton } from "@/components/skeletons/MapSkeleton";
import { StockPharmacyCardSkeleton } from "@/components/skeletons/StockPharmacyCardSkeleton";
import { Skeleton } from "@/components/ui/Skeleton";

export function StockResultsSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-11 w-full md:hidden" />
      <Skeleton className="h-11 w-full" />

      <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-6">
        <div className="flex flex-col gap-3 md:w-2/5">
          {Array.from({ length: 4 }).map((_, i) => (
            <StockPharmacyCardSkeleton key={i} />
          ))}
        </div>
        <div className="md:w-3/5">
          <MapSkeleton />
        </div>
      </div>
    </div>
  );
}
