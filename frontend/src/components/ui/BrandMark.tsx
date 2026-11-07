import { useId } from "react";

type BrandMarkProps = {
  className?: string;
};

/** The logo glyph (see app/icon.svg — keep the two in sync). A pharmacy
 *  cross in a soft rounded tile: legible as the pharmacy sign in France
 *  and Tunisia, and deliberately not a pill (a pill reads as medication
 *  advice, which the brief forbids). The small dot is the "found it"
 *  signal — Mawjoud (موجود) means "available / present". */
export function BrandMark({ className }: BrandMarkProps) {
  // Unique per instance: the mark renders in both header and footer.
  const gradientId = `mawjoud-mark-${useId().replace(/:/g, "")}`;
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className} fill="none">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--brand-500)" />
          <stop offset="1" stopColor="var(--brand-700)" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${gradientId})`} />
      <path d="M16 9v14M9 16h14" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" />
      <circle cx="24.5" cy="7.5" r="3.5" fill="#fbbf24" stroke="var(--canvas)" strokeWidth="1.5" />
    </svg>
  );
}
