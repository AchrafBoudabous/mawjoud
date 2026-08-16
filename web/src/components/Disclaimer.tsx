import { getDictionary } from "@/lib/i18n";

export function Disclaimer() {
  const dict = getDictionary();

  return (
    <p
      role="note"
      className="rounded-lg border border-warn-border bg-warn-bg px-4 py-3 text-sm text-warn-text"
    >
      {dict.common.disclaimer}
    </p>
  );
}
