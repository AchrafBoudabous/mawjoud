import { Icon } from "@/components/ui/Icon";
import { getDictionary } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** The single canonical implementation of the CLAUDE.md non-negotiable:
 *  every patient-facing page shows this. Deliberately NOT built on
 *  `NoticeCard` so it can never be refactored away or reused for
 *  something that is not the disclaimer. */
export function Disclaimer({ className }: { className?: string }) {
  const dict = getDictionary();

  return (
    <div
      role="note"
      aria-label={dict.common.disclaimerTitle}
      className={cn(
        "flex items-start gap-3 rounded-card border border-warn-border/60 bg-warn-bg px-4 py-3 text-warn-text",
        className
      )}
    >
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-warn-border/25">
        <Icon name="shield" className="size-4" />
      </span>
      <p className="text-sm leading-relaxed">
        {dict.common.disclaimer}{" "}
        <strong className="font-bold">{dict.common.disclaimerAction}</strong>
      </p>
    </div>
  );
}
