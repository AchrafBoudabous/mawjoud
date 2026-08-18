import { MedicationCardSkeleton } from "@/components/skeletons/MedicationCardSkeleton";
import { Skeleton } from "@/components/ui/Skeleton";

export function TrackedMedicationsSkeleton() {
  return (
    <section>
      <Skeleton className="h-4.5 w-48" />
      <Skeleton className="mt-2 h-3.5 w-64" />
      <Skeleton className="mt-2 h-3.5 w-3/4" />

      <div className="mt-4 flex flex-col gap-6">
        {Array.from({ length: 4 }).map((_, groupIndex) => (
          <div key={groupIndex}>
            <Skeleton className="h-4 w-40" />
            <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, cardIndex) => (
                <MedicationCardSkeleton key={cardIndex} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
