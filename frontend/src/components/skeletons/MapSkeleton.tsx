type MapSkeletonProps = {
  label?: string;
};

/** Deliberately not `aria-hidden` when it carries a label: tiles genuinely
 *  take seconds to load and a silent grey box would read as broken. */
export function MapSkeleton({ label }: MapSkeletonProps) {
  return (
    <div className="flex h-[62vh] min-h-80 w-full animate-pulse-soft items-center justify-center rounded-panel border border-line bg-skeleton text-sm text-muted md:h-[calc(100dvh-7rem)]">
      {label}
    </div>
  );
}
