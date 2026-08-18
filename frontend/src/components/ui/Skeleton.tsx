type SkeletonProps = {
  className?: string;
};

/** A calm 2s opacity pulse (1.0 -> 0.6), never a sweeping shimmer — a
 *  shimmer implies speed, a slow pulse honestly signals "working on it"
 *  for a free-tier instance that may take up to a minute to wake.
 *  `aria-hidden`: every screen that renders a Skeleton must also render
 *  an `sr-only role="status"` French loading string alongside it. */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse-soft rounded-field bg-skeleton ${className ?? ""}`}
    />
  );
}

const TEXT_HEIGHTS: Record<NonNullable<SkeletonTextProps["size"]>, string> = {
  xs: "h-3",
  sm: "h-3.5",
  base: "h-4",
  lg: "h-4.5",
  xl: "h-5",
  "2xl": "h-6",
};

type SkeletonTextProps = {
  width?: string;
  size?: "xs" | "sm" | "base" | "lg" | "xl" | "2xl";
};

/** `size` maps to the type scale so a text skeleton is the height of the
 *  line it stands in for. */
export function SkeletonText({ width = "w-full", size = "sm" }: SkeletonTextProps) {
  return <Skeleton className={`${TEXT_HEIGHTS[size]} rounded-sm ${width}`} />;
}
