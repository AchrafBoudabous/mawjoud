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

/** The shared informational panel. `Disclaimer` intentionally does NOT
 *  reuse this component: it stays the single canonical implementation of
 *  a CLAUDE.md non-negotiable, sharing the visual language only. */
export function NoticeCard({ tone, icon, title, children, role = "note" }: NoticeCardProps) {
  const toneClasses =
    tone === "info"
      ? "border-brand-200 bg-brand-50 text-ink"
      : "border-warn-border/60 bg-warn-bg text-warn-text";
  const iconTile = tone === "info" ? "bg-surface text-brand-600 shadow-card" : "bg-warn-border/25";

  return (
    <div role={role} className={`flex items-start gap-3 rounded-card border px-4 py-3.5 ${toneClasses}`}>
      {icon && (
        <span className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full ${iconTile}`}>
          <Icon name={icon} className="size-4" />
        </span>
      )}
      <div>
        {title && <p className="text-sm font-bold">{title}</p>}
        <div className="text-sm leading-relaxed">{children}</div>
      </div>
    </div>
  );
}
