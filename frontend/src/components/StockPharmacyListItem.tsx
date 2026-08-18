import type { ReportUiState } from "@/components/StockReportButtons";
import { REPORT_UI_IDLE, StockReportButtons } from "@/components/StockReportButtons";
import { StockReportTime } from "@/components/StockReportTime";
import { StockStatusBadge } from "@/components/StockStatusBadge";
import { PhoneLink } from "@/components/ui/PhoneLink";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import type { PatientReportStatus, PharmacyStock } from "@/lib/api";
import { getDictionary } from "@/lib/i18n";
import { BUTTON_BASE, BUTTON_SECONDARY, CARD_INTERACTIVE } from "@/lib/ui";

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
      className={`cursor-pointer p-4 ${CARD_INTERACTIVE} ${
        isSelected ? "border-brand-600 ring-1 ring-brand-600" : ""
      }`}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <h3 className="font-semibold text-ink">{pharmacy.name}</h3>
        <div className="self-start">
          <StockStatusBadge status={pharmacy.status} />
        </div>
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
      <div className="mt-2">
        <PhoneLink phone={pharmacy.phone} />
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onSelect(pharmacy.id);
        }}
        className={`mt-3 ${BUTTON_BASE} ${BUTTON_SECONDARY} md:hidden`}
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
