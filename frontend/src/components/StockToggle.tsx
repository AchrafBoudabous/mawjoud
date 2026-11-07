import type { StockStatus, StockStatusView } from "@/lib/api";
import { getDictionary } from "@/lib/i18n";
import { STOCK_STYLES } from "@/lib/stock";

export type ToggleUiState = {
  phase: "idle" | "saving" | "error";
  pending?: StockStatus;
  slow: boolean;
};

type StockToggleProps = {
  medicationName: string; // for the group's aria-label
  current: StockStatusView; // may be "none"
  state: ToggleUiState;
  disabled?: boolean; // true for non-active accounts
  onSelect: (status: StockStatus) => void;
};

const TOGGLE_VALUES: StockStatus[] = ["in_stock", "out_of_stock", "unsure"];

export function StockToggle({
  medicationName,
  current,
  state,
  disabled = false,
  onSelect,
}: StockToggleProps) {
  const dict = getDictionary();
  const saving = state.phase === "saving";
  const allDisabled = disabled || saving;

  return (
    <div className="mt-2">
      <div
        role="group"
        aria-label={dict.pharmacist.toggle.ariaLabel(medicationName)}
        aria-busy={saving}
        className="grid grid-cols-3 gap-1 rounded-control bg-surface-2 p-1 ring-1 ring-inset ring-line"
      >
        {TOGGLE_VALUES.map((value) => {
          const isSelected = current === value;
          const isPending = saving && state.pending === value;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={isSelected}
              disabled={allDisabled}
              onClick={() => onSelect(value)}
              className={`pressable min-h-11 rounded-[0.6rem] px-1.5 text-center text-sm font-semibold leading-tight disabled:cursor-not-allowed disabled:opacity-55 ${
                isSelected
                  ? `shadow-raised ring-1 ring-inset ring-current/25 ${STOCK_STYLES[value].badge}`
                  : "text-muted hover:bg-surface hover:text-ink"
              }`}
            >
              {isPending ? (
                <span className="inline-flex items-center gap-1.5">
                  <span aria-hidden className="size-1.5 animate-pulse-soft rounded-full bg-current" />
                  <span className="opacity-70">{dict.stock.status[value]}</span>
                  <span className="sr-only">{dict.pharmacist.dashboard.saving}</span>
                </span>
              ) : (
                dict.stock.status[value]
              )}
            </button>
          );
        })}
      </div>

      {saving && state.slow && <p className="mt-2 text-xs text-muted">{dict.report.slow}</p>}

      {state.phase === "error" && (
        <p role="alert" className="mt-2 text-sm text-stock-out">
          {dict.pharmacist.dashboard.saveError}
        </p>
      )}
    </div>
  );
}
