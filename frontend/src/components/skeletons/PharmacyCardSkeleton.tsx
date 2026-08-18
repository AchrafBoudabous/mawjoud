import { Skeleton } from "@/components/ui/Skeleton";
import { CARD } from "@/lib/ui";

export function PharmacyCardSkeleton() {
  return (
    <div className={`${CARD} p-4`}>
      <Skeleton className="h-4 w-3/5" />
      <Skeleton className="mt-2 h-3.5 w-4/5" />
      <Skeleton className="mt-3 h-3.5 w-2/5" />
    </div>
  );
}
