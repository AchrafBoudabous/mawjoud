import { Skeleton } from "@/components/ui/Skeleton";
import { CARD } from "@/lib/ui";

export function PharmacistRowSkeleton() {
  return (
    <div className={`${CARD} p-4`}>
      <Skeleton className="h-4 w-3/5" />
      <Skeleton className="mt-2 h-3.5 w-4/5" />
      <Skeleton className="mt-3 h-6 w-28 rounded-full" />
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Skeleton className="h-11" />
        <Skeleton className="h-11" />
        <Skeleton className="h-11" />
      </div>
    </div>
  );
}
