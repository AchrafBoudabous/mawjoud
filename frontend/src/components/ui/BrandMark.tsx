type BrandMarkProps = {
  className?: string;
};

/** The wordmark glyph and the favicon geometry (see app/icon.svg — keep the
 *  two in sync). A medical cross in a rounded square: legible as the
 *  pharmacy sign in France and Tunisia, and deliberately not a pill (a
 *  pill reads as "medication advice", which the brief forbids). */
export function BrandMark({ className }: BrandMarkProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none">
      <rect x="1.5" y="1.5" width="21" height="21" rx="6" fill="currentColor" opacity="0.1" />
      <rect x="1.5" y="1.5" width="21" height="21" rx="6" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 7v10M7 12h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
