import type { IconName } from "@/components/ui/Icon";
import { Icon } from "@/components/ui/Icon";

type NoticeCardProps = {
  tone: "info" | "warn";
  icon?: IconName;
  title?: string;
  children: React.ReactNode;
  /** default "note" */
  role?: "note" | "status" | "alert";
};

/** The shared informational panel. Used by PharmacistNotice,
 *  AccountStatusBanner and the zero-report notice on /medicaments/[slug].
 *  `Disclaimer` intentionally does NOT reuse this component — see
 *  docs/ARCHITECTURE.md 8.7: it stays the single canonical implementation
 *  of a CLAUDE.md non-negotiable, sharing the visual language only. */
export function NoticeCard({ tone, icon, title, children, role = "note" }: NoticeCardProps) {
  const toneClasses =
    tone === "info"
      ? "border-brand-600/20 bg-brand-50 text-ink"
      : "border-warn-border/70 bg-warn-bg text-warn-text";

  return (
    <div role={role} className={`flex items-start gap-2.5 rounded-card border px-3.5 py-3 ${toneClasses}`}>
      {icon && <Icon name={icon} className="mt-0.5 size-4 shrink-0" />}
      <div>
        {title && <p className="text-sm font-semibold">{title}</p>}
        <div className="text-sm leading-relaxed">{children}</div>
      </div>
    </div>
  );
}
