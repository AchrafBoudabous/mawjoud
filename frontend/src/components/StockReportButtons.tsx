import type { PatientReportStatus } from "@/lib/api";
import { getDictionary } from "@/lib/i18n";
import type { ReportErrorKind } from "@/lib/stock";
import { BUTTON_QUIET } from "@/lib/ui";

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
    <div className="mt-3 border-t border-line pt-3">
      <p className="text-xs text-muted">{dict.report.prompt}</p>

      {state.phase === "done" && state.status ? (
        <div className="mt-2 min-h-11">
          <p role="status" className="text-sm text-stock-in transition-colors duration-150 ease-standard">
            {dict.report.thanks(dict.stock.status[state.status])}
          </p>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onReset(pharmacyId);
            }}
            className={`mt-1 text-xs ${BUTTON_QUIET}`}
          >
            {dict.report.correct}
          </button>
        </div>
      ) : (
        <>
          {state.phase === "error" && state.error && (
            <p
              role="alert"
              className="mt-2 text-sm text-stock-out transition-colors duration-150 ease-standard"
            >
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
              onClick={(e) => {
                e.stopPropagation();
                onReport(pharmacyId, "in_stock");
              }}
              className="min-h-11 rounded-control border border-stock-in px-2 py-2 text-center text-sm font-medium leading-tight text-stock-in disabled:cursor-not-allowed disabled:opacity-60"
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
              className="min-h-11 rounded-control border border-stock-out px-2 py-2 text-center text-sm font-medium leading-tight text-stock-out disabled:cursor-not-allowed disabled:opacity-60"
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
