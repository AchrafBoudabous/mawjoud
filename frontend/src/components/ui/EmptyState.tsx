import type { IconName } from "@/components/ui/Icon";
import { Icon } from "@/components/ui/Icon";

type EmptyStateProps = {
  icon: IconName;
  title: string;
  body?: string;
  action?: React.ReactNode;
  /** default "neutral" */
  tone?: "neutral" | "warn";
  /** default 2; use 1 for a page's primary heading (not-found, no-account). */
  headingLevel?: 1 | 2;
  /** default "status" */
  role?: "status" | "alert";
};

/** A 44px brand-tinted circle with a monochrome line glyph, a title, one
 *  muted line of body copy and at most one action — never a scene, a
 *  character or colour outside the palette. Error tones use `warn-*` and
 *  `role="alert"`; emptiness uses `brand-*` and `role="status"`, so a
 *  failure and an emptiness are never confused at a glance.
 *  See docs/ARCHITECTURE.md 8.9. */
export function EmptyState({
  icon,
  title,
  body,
  action,
  tone = "neutral",
  headingLevel = 2,
  role = "status",
}: EmptyStateProps) {
  const Heading = headingLevel === 1 ? "h1" : "h2";

  return (
    <div
      role={role}
      className="flex flex-col items-center gap-3 rounded-card border border-line bg-surface px-5 py-10 text-center shadow-card"
    >
      <span
        className={`flex size-11 shrink-0 items-center justify-center rounded-full ${
          tone === "warn" ? "bg-warn-bg text-warn-text" : "bg-brand-50 text-brand-600"
        }`}
      >
        <Icon name={icon} className="size-5" />
      </span>
      <Heading className="text-base font-semibold text-ink">{title}</Heading>
      {body && <p className="max-w-[48ch] text-sm text-muted">{body}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
