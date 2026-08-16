import type { ReportUiState } from "@/components/StockReportButtons";
import { REPORT_UI_IDLE, StockReportButtons } from "@/components/StockReportButtons";
import { StockReportTime } from "@/components/StockReportTime";
import { StockStatusBadge } from "@/components/StockStatusBadge";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import type { PatientReportStatus, PharmacyStock } from "@/lib/api";
import { formatPhone } from "@/lib/format";
import { getDictionary } from "@/lib/i18n";

type StockPharmacyListItemProps = {
  pharmacy: PharmacyStock;
  isSelected: boolean;
  onSelect: (id: string) => void;
  reportState: ReportUiState | undefined;
  onReport: (pharmacyId: string, status: PatientReportStatus) => void;
  onResetReport: (pharmacyId: string) => void;
};

export function StockPharmacyListItem({
  pharmacy,
  isSelected,
  onSelect,
  reportState,
  onReport,
  onResetReport,
}: StockPharmacyListItemProps) {
  const dict = getDictionary();

  return (
    <li
      onClick={() => onSelect(pharmacy.id)}
      className={`cursor-pointer rounded-lg border bg-surface p-4 ${
        isSelected ? "border-brand-600 ring-1 ring-brand-600" : "border-gray-200"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-ink">{pharmacy.name}</h3>
        <StockStatusBadge status={pharmacy.status} />
      </div>
      {pharmacy.verified && (
        <div className="mt-1">
          <VerifiedBadge />
        </div>
      )}
      {pharmacy.status !== "none" && pharmacy.reported_at && (
        <StockReportTime iso={pharmacy.reported_at} source={pharmacy.reported_by} />
      )}
      <p className="mt-2 text-sm text-muted">{pharmacy.address}</p>
      {pharmacy.city !== "Bizerte" && (
        <p className="text-sm text-muted">{pharmacy.city}</p>
      )}
      {pharmacy.phone ? (
        <p className="mt-2 text-sm">
          <a
            href={`tel:${pharmacy.phone}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-block min-h-11 py-2 font-medium text-brand-600 underline"
          >
            {formatPhone(pharmacy.phone)}
          </a>
        </p>
      ) : (
        <p className="mt-2 text-sm text-muted">{dict.pharmacies.noPhone}</p>
      )}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onSelect(pharmacy.id);
        }}
        className="mt-3 min-h-11 rounded-md border border-gray-200 px-3 py-2 text-sm font-medium text-brand-600 md:hidden"
      >
        {dict.pharmacies.showOnMap}
      </button>
      <StockReportButtons
        pharmacyId={pharmacy.id}
        pharmacyName={pharmacy.name}
        state={reportState ?? REPORT_UI_IDLE}
        onReport={onReport}
        onReset={onResetReport}
        layout="row"
      />
    </li>
  );
}
