import { Skeleton } from "@/components/ui/Skeleton";

export function RegistrationFormSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-1.5">
          <Skeleton className="h-4 w-2/5" />
          <Skeleton className="h-12 w-full rounded-field" />
        </div>
      ))}
      <Skeleton className="h-11 w-full" />
    </div>
  );
}
