import type { IconName } from "@/components/ui/Icon";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

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

/** A tinted glyph tile, a title, one muted line and at most one action.
 *  Error tones use `warn-*` and `role="alert"`; emptiness uses `brand-*`
 *  and `role="status"`, so a failure and an emptiness are never confused. */
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
      className="flex flex-col items-center gap-3 rounded-panel border border-dashed border-line-strong bg-surface px-6 py-12 text-center animate-fade-in"
    >
      <span
        className={cn(
          "flex size-14 shrink-0 items-center justify-center rounded-card ring-8",
          tone === "warn"
            ? "bg-warn-bg text-warn-text ring-warn-bg/40"
            : "bg-brand-50 text-brand-600 ring-brand-50/40"
        )}
      >
        <Icon name={icon} className="size-6" />
      </span>
      <Heading className="mt-2 text-lg font-bold text-ink">{title}</Heading>
      {body && <p className="max-w-[48ch] text-sm text-muted">{body}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
