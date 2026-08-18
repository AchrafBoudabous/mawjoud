import { PharmacistRowSkeleton } from "@/components/skeletons/PharmacistRowSkeleton";
import { Skeleton } from "@/components/ui/Skeleton";

export function PharmacistDashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Skeleton className="h-5 w-2/5" />
        <Skeleton className="mt-2 h-3.5 w-3/5" />
      </div>

      <Skeleton className="h-3.5 w-1/2" />

      <div className="flex flex-col gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <PharmacistRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
