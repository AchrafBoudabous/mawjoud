import { Icon } from "@/components/ui/Icon";
import { getDictionary } from "@/lib/i18n";

/** The single canonical implementation of the CLAUDE.md non-negotiable:
 *  every patient-facing page shows this. Deliberately NOT built on
 *  `NoticeCard` — see docs/ARCHITECTURE.md 8.7 — so it can never be
 *  refactored away or reused for something that is not the disclaimer. */
export function Disclaimer() {
  const dict = getDictionary();

  return (
    <div
      role="note"
      className="flex items-start gap-2.5 rounded-card border border-warn-border/70 bg-warn-bg px-3.5 py-3 text-warn-text"
    >
      <Icon name="info" className="mt-0.5 size-4 shrink-0" />
      <p className="text-sm leading-relaxed">
        {dict.common.disclaimer}{" "}
        <strong className="font-semibold">{dict.common.disclaimerAction}</strong>
      </p>
    </div>
  );
}
