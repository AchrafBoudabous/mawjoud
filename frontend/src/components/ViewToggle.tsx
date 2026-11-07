"use client";

import { Icon } from "@/components/ui/Icon";
import { getDictionary } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type View = "list" | "map";

type ViewToggleProps = {
  view: View;
  onChange: (view: View) => void;
  className?: string;
};

/** Segmented control with a sliding thumb (CSS transform only). */
export function ViewToggle({ view, onChange, className }: ViewToggleProps) {
  const dict = getDictionary();

  const options: { value: View; label: string; icon: "list" | "map" }[] = [
    { value: "list", label: dict.pharmacies.viewList, icon: "list" },
    { value: "map", label: dict.pharmacies.viewMap, icon: "map" },
  ];

  return (
    <div
      role="group"
      aria-label={dict.pharmacies.viewToggleLabel}
      className={cn(
        "relative grid grid-cols-2 rounded-full border border-line bg-surface-2 p-1",
        className
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-surface shadow-raised transition-transform duration-300 ease-[var(--ease-spring)]",
          view === "map" && "translate-x-full"
        )}
      />
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={view === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "relative z-10 inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-colors duration-200",
            view === o.value ? "text-brand-700" : "text-muted hover:text-ink"
          )}
        >
          <Icon name={o.icon} className="size-4" />
          {o.label}
        </button>
      ))}
    </div>
  );
}
