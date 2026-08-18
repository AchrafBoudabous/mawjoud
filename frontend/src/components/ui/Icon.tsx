/**
 * Every inline SVG in the app lives here, so the icon vocabulary is
 * auditable in one place and can never drift into six styles. No
 * third-party icon package (see docs/ARCHITECTURE.md 8.19).
 *
 * House style, binding on every icon: 24x24 viewBox, fill="none",
 * stroke="currentColor", strokeWidth 1.5 (1.75 when the icon is always
 * rendered below 20px in this app), strokeLinecap="round",
 * strokeLinejoin="round", aria-hidden="true". No filled icons here —
 * the sole filled exceptions (VerifiedBadge's check, BrandMark) live in
 * their own files. See docs/ARCHITECTURE.md 8.7.
 */

export type IconName =
  | "chevron-left"
  | "chevron-down"
  | "search"
  | "pharmacy"
  | "report"
  | "alert"
  | "info"
  | "phone"
  | "check";

type IconProps = {
  name: IconName;
  className?: string;
  strokeWidth?: number;
};

/** Default stroke weight for each glyph, per its typical rendered size in
 *  this app (below 20px gets the heavier 1.75 weight for legibility). */
const DEFAULT_STROKE_WIDTH: Record<IconName, number> = {
  "chevron-left": 1.75,
  "chevron-down": 1.75,
  search: 1.5,
  pharmacy: 1.5,
  report: 1.75,
  alert: 1.5,
  info: 1.75,
  phone: 1.75,
  check: 1.5,
};

const PATHS: Record<IconName, React.ReactNode> = {
  "chevron-left": <path d="M15 18l-6-6 6-6" />,
  "chevron-down": <path d="M6 9l6 6 6-6" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.35-4.35" />
    </>
  ),
  pharmacy: (
    <>
      <path d="M3 10l1.5-6h15L21 10" />
      <path d="M4 10v10h16V10" />
      <path d="M9 20v-6h6v6" />
    </>
  ),
  report: (
    <path d="M21 11.5a8.38 8.38 0 0 1-4.7 7.6 8.5 8.5 0 0 1-3.8.9 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  ),
  alert: (
    <>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </>
  ),
  phone: (
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
  ),
  check: <path d="M20 6L9 17l-5-5" />,
};

export function Icon({ name, className, strokeWidth }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth ?? DEFAULT_STROKE_WIDTH[name]}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {PATHS[name]}
    </svg>
  );
}
