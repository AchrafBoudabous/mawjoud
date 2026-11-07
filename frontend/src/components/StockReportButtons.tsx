import { Icon } from "@/components/ui/Icon";
import type { PatientReportStatus } from "@/lib/api";
import { getDictionary } from "@/lib/i18n";
import type { ReportErrorKind } from "@/lib/stock";
import { BUTTON_QUIET, buttonVariants } from "@/lib/ui";
import { cn } from "@/lib/utils";

export type ReportUiState = {
  phase: "idle" | "sending" | "done" | "error";
  slow: boolean;
  status?: PatientReportStatus;
  error?: ReportErrorKind;
};

export const REPORT_UI_IDLE: ReportUiState = { phase: "idle", slow: false };

type StockReportButtonsProps = {
  pharmacyId: string;
  pharmacyName: string; // for the group's aria-label only
  state: ReportUiState;
  onReport: (pharmacyId: string, status: PatientReportStatus) => void;
  onReset: (pharmacyId: string) => void;
  layout?: "row" | "column";
};

export function StockReportButtons({
  pharmacyId,
  pharmacyName,
  state,
  onReport,
  onReset,
  layout = "row",
}: StockReportButtonsProps) {
  const dict = getDictionary();
  const sending = state.phase === "sending";

  return (
    <div className="mt-4 rounded-control bg-surface-2 p-3">
      <p className="text-xs font-semibold text-ink-soft">{dict.report.prompt}</p>

      {state.phase === "done" && state.status ? (
        <div className="mt-2 flex min-h-11 flex-wrap items-center justify-between gap-2 animate-pop">
          <p role="status" className="inline-flex items-center gap-2 text-sm font-semibold text-stock-in">
            <span className="flex size-6 items-center justify-center rounded-full bg-stock-in-bg">
              <Icon name="check" className="size-3.5" strokeWidth={2.6} />
            </span>
            {dict.report.thanks(dict.stock.status[state.status])}
          </p>
          <button
            type="button"
            onClick={() => onReset(pharmacyId)}
            className={cn("min-h-9 text-xs", BUTTON_QUIET)}
          >
            {dict.report.correct}
          </button>
        </div>
      ) : (
        <>
          {state.phase === "error" && state.error && (
            <p role="alert" className="mt-2 flex items-start gap-1.5 text-sm text-stock-out">
              <Icon name="alert" className="mt-0.5 size-4 shrink-0" />
              {dict.report.errors[state.error]}
            </p>
          )}

          <div
            role="group"
            aria-label={dict.report.buttonsAriaLabel(pharmacyName)}
            aria-busy={sending}
            className={layout === "column" ? "mt-2 flex flex-col gap-2" : "mt-2 grid grid-cols-2 gap-2"}
          >
            <button
              type="button"
              disabled={sending}
              onClick={() => onReport(pharmacyId, "in_stock")}
              className={cn(buttonVariants({ variant: "success", size: "md" }), "whitespace-normal px-2 text-center")}
            >
              <Icon
                name={sending && state.status === "in_stock" ? "loader" : "check-circle"}
                className={cn(sending && state.status === "in_stock" && "animate-spin")}
              />
              {sending && state.status === "in_stock" ? dict.report.sending : dict.report.inStock}
            </button>
            <button
              type="button"
              disabled={sending}
              onClick={() => onReport(pharmacyId, "out_of_stock")}
              className={cn(buttonVariants({ variant: "danger", size: "md" }), "whitespace-normal px-2 text-center")}
            >
              <Icon
                name={sending && state.status === "out_of_stock" ? "loader" : "x-circle"}
                className={cn(sending && state.status === "out_of_stock" && "animate-spin")}
              />
              {sending && state.status === "out_of_stock"
                ? dict.report.sending
                : dict.report.outOfStock}
            </button>
          </div>

          {sending && state.slow && <p className="mt-2 text-xs text-muted">{dict.report.slow}</p>}
        </>
      )}
    </div>
  );
}
