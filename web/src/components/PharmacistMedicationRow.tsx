import Link from "next/link";
import { StockReportTime } from "@/components/StockReportTime";
import { StockStatusBadge } from "@/components/StockStatusBadge";
import type { ToggleUiState } from "@/components/StockToggle";
import { StockToggle } from "@/components/StockToggle";
import type { DashboardMedication, StockStatus } from "@/lib/api";
import { getDictionary } from "@/lib/i18n";

type PharmacistMedicationRowProps = {
  medication: DashboardMedication;
  toggleState: ToggleUiState;
  disabled: boolean;
  onToggle: (medication: DashboardMedication, status: StockStatus) => void;
};

export function PharmacistMedicationRow({
  medication,
  toggleState,
  disabled,
  onToggle,
}: PharmacistMedicationRowProps) {
  const dict = getDictionary();

  return (
    <li className="rounded-lg border bg-surface p-4">
      <h4 className="font-medium text-ink">{medication.name}</h4>
      <p className="text-sm text-muted">
        {medication.generic_name}
        {medication.form ? ` · ${medication.form}` : ""}
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <StockStatusBadge status={medication.status} />
        {medication.status !== "none" && medication.reported_at ? (
          <StockReportTime iso={medication.reported_at} source={medication.reported_by} />
        ) : medication.status === "none" ? (
          <span className="text-sm text-muted">{dict.pharmacist.dashboard.neverReported}</span>
        ) : null}
      </div>

      {medication.reported_by === "patient" && (
        <p className="mt-1 text-xs text-muted">{dict.pharmacist.dashboard.lastByPatientHint}</p>
      )}

      <StockToggle
        medicationName={medication.name}
        current={medication.status}
        state={toggleState}
        disabled={disabled}
        onSelect={(status) => onToggle(medication, status)}
      />

      <p
        className="mt-2 text-xs text-muted"
        title={dict.pharmacist.dashboard.searchCountHint}
      >
        {dict.pharmacist.dashboard.searchCount(medication.searches_last_7_days)}
      </p>

      <Link
        href={`/medicaments/${medication.slug}`}
        className="mt-1 inline-block text-xs text-brand-600 underline"
      >
        {dict.pharmacist.dashboard.viewPublicPage}
      </Link>
    </li>
  );
}
