import { Skeleton } from "@/components/ui/Skeleton";

export function SearchFieldSkeleton() {
  return (
    <div>
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="mt-2 h-12 w-full rounded-field" />
      <Skeleton className="mt-1 h-3 w-3/4" />
    </div>
  );
}
