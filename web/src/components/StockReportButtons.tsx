import type { PatientReportStatus } from "@/lib/api";
import { getDictionary } from "@/lib/i18n";
import type { ReportErrorKind } from "@/lib/stock";

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
    <div className="mt-3 border-t pt-3">
      <p className="text-xs text-muted">{dict.report.prompt}</p>

      {state.phase === "done" && state.status ? (
        <>
          <p role="status" className="mt-2 text-sm text-stock-in">
            {dict.report.thanks(dict.stock.status[state.status])}
          </p>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onReset(pharmacyId);
            }}
            className="mt-1 text-xs text-brand-600 underline"
          >
            {dict.report.correct}
          </button>
        </>
      ) : (
        <>
          {state.phase === "error" && state.error && (
            <p role="alert" className="mt-2 text-sm text-stock-out">
              {dict.report.errors[state.error]}
            </p>
          )}

          <div
            role="group"
            aria-label={dict.report.buttonsAriaLabel(pharmacyName)}
            aria-busy={sending}
            className={layout === "column" ? "mt-2 flex flex-col gap-2" : "mt-2 flex gap-3"}
          >
            <button
              type="button"
              disabled={sending}
              onClick={(e) => {
                e.stopPropagation();
                onReport(pharmacyId, "in_stock");
              }}
              className="min-h-11 flex-1 rounded-lg border border-stock-in px-3 text-sm font-medium text-stock-in disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sending && state.status === "in_stock" ? dict.report.sending : dict.report.inStock}
            </button>
            <button
              type="button"
              disabled={sending}
              onClick={(e) => {
                e.stopPropagation();
                onReport(pharmacyId, "out_of_stock");
              }}
              className="min-h-11 flex-1 rounded-lg border border-stock-out px-3 text-sm font-medium text-stock-out disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sending && state.status === "out_of_stock"
                ? dict.report.sending
                : dict.report.outOfStock}
            </button>
          </div>

          {sending && state.slow && (
            <p className="mt-2 text-xs text-muted">{dict.report.slow}</p>
          )}
        </>
      )}
    </div>
  );
}
