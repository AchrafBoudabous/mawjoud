import { Skeleton } from "@/components/ui/Skeleton";
import { CARD } from "@/lib/ui";

export function MedicationCardSkeleton() {
  return (
    <div className={`${CARD} p-4`}>
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="mt-2 h-3.5 w-3/5" />
    </div>
  );
}
