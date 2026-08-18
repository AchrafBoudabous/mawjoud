import { Skeleton } from "@/components/ui/Skeleton";
import { CARD } from "@/lib/ui";

export function StockPharmacyCardSkeleton() {
  return (
    <div className={`${CARD} p-4`}>
      <div className="flex items-start justify-between gap-3">
        <Skeleton className="h-4 w-3/5" />
        <Skeleton className="h-6 w-28 rounded-full" />
      </div>
      <Skeleton className="mt-2 h-3.5 w-4/5" />
      <Skeleton className="mt-3 h-3.5 w-2/5" />
      <div className="mt-3 border-t border-line pt-3">
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-11" />
          <Skeleton className="h-11" />
        </div>
      </div>
    </div>
  );
}
