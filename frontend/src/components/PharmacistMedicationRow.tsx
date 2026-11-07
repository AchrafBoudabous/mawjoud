import Link from "next/link";
import { StockReportTime } from "@/components/StockReportTime";
import { StockStatusBadge } from "@/components/StockStatusBadge";
import type { ToggleUiState } from "@/components/StockToggle";
import { StockToggle } from "@/components/StockToggle";
import type { DashboardMedication, StockStatus } from "@/lib/api";
import { getDictionary } from "@/lib/i18n";
import { Icon } from "@/components/ui/Icon";
import { CARD } from "@/lib/ui";

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
    <li className={`${CARD} p-4`}>
      <h4 className="font-bold text-ink">{medication.name}</h4>
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

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-xs text-muted">
        <span title={dict.pharmacist.dashboard.searchCountHint} className="inline-flex items-center gap-1.5 tabular-nums">
          <Icon name="users" className="size-3.5" />
          {dict.pharmacist.dashboard.searchCount(medication.searches_last_7_days)}
        </span>
        <Link href={`/medicaments/${medication.slug}`} className="inline-flex items-center gap-1 font-semibold text-brand-700 transition-colors duration-150 ease-standard hover:text-brand-800">
          {dict.pharmacist.dashboard.viewPublicPage}
          <Icon name="arrow-right" className="size-3.5" />
        </Link>
      </div>
    </li>
  );
}
