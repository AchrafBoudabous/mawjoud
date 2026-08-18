"use client";

import { getDictionary } from "@/lib/i18n";

type View = "list" | "map";

type ViewToggleProps = {
  view: View;
  onChange: (view: View) => void;
  className?: string;
};

export function ViewToggle({ view, onChange, className }: ViewToggleProps) {
  const dict = getDictionary();

  const baseButton =
    "flex-1 min-h-11 rounded-control px-3 py-2 text-sm font-medium transition-colors duration-150 ease-standard";
  const activeButton = "bg-brand-600 text-white";
  const inactiveButton = "bg-surface text-ink border border-line";

  return (
    <div
      role="group"
      aria-label={dict.pharmacies.viewToggleLabel}
      className={`flex gap-2 ${className ?? ""}`}
    >
      <button
        type="button"
        aria-pressed={view === "list"}
        onClick={() => onChange("list")}
        className={`${baseButton} ${view === "list" ? activeButton : inactiveButton}`}
      >
        {dict.pharmacies.viewList}
      </button>
      <button
        type="button"
        aria-pressed={view === "map"}
        onClick={() => onChange("map")}
        className={`${baseButton} ${view === "map" ? activeButton : inactiveButton}`}
      >
        {dict.pharmacies.viewMap}
      </button>
    </div>
  );
}
