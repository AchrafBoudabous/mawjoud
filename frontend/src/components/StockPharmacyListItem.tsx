import { CallScriptButton } from "@/components/CallScriptButton";
import { ConfidenceLine } from "@/components/ConfidenceLine";
import { DutyBadge } from "@/components/DutyBadge";
import type { ReportUiState } from "@/components/StockReportButtons";
import { REPORT_UI_IDLE, StockReportButtons } from "@/components/StockReportButtons";
import { StockReportTime } from "@/components/StockReportTime";
import { StockStatusBadge } from "@/components/StockStatusBadge";
import { Icon } from "@/components/ui/Icon";
import { PhoneLink } from "@/components/ui/PhoneLink";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import type { Medication, PatientReportStatus, PharmacyStock } from "@/lib/api";
import { formatDistance } from "@/lib/geo";
import { getDictionary } from "@/lib/i18n";
import { STOCK_STYLES } from "@/lib/stock";
import { BUTTON_BASE } from "@/lib/ui";
import { cn } from "@/lib/utils";

type StockPharmacyListItemProps = {
  pharmacy: PharmacyStock;
  medication: Medication;
  distanceKm: number | null;
  isSelected: boolean;
  onSelect: (id: string) => void;
  reportState: ReportUiState | undefined;
  onReport: (pharmacyId: string, status: PatientReportStatus) => void;
  onResetReport: (pharmacyId: string) => void;
};

export function StockPharmacyListItem({
  pharmacy,
  medication,
  distanceKm,
  isSelected,
  onSelect,
  reportState,
  onReport,
  onResetReport,
}: StockPharmacyListItemProps) {
  const dict = getDictionary();

  return (
    <li
      className={cn(
        "relative overflow-hidden rounded-card border bg-surface p-4 pl-5 shadow-card transition-[border-color,box-shadow] duration-200 ease-standard hover:shadow-raised",
        isSelected ? "border-brand-500 ring-2 ring-brand-500/25" : "border-line"
      )}
    >
      {/* Status accent stripe — decorative; the badge carries the meaning. */}
      <span
        aria-hidden="true"
        className={cn("absolute inset-y-0 left-0 w-1.5", STOCK_STYLES[pharmacy.status].accent)}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 dir="auto" className="text-base font-bold text-ink">{pharmacy.name}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {pharmacy.verified && <VerifiedBadge />}
            <DutyBadge onDutyUntil={pharmacy.on_duty_until} is24h={pharmacy.is_24h} />
            {distanceKm !== null && (
              <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-xs font-semibold text-ink-soft tabular-nums">
                <Icon name="map-pin" className="size-3" />
                {dict.nearby.distanceAway(formatDistance(distanceKm))}
              </span>
            )}
          </div>
        </div>
        <StockStatusBadge status={pharmacy.status} />
      </div>

      {pharmacy.status !== "none" && pharmacy.reported_at && (
        <div className="mt-2 flex flex-col gap-1">
          <StockReportTime iso={pharmacy.reported_at} source={pharmacy.reported_by} />
          <ConfidenceLine pharmacy={pharmacy} />
        </div>
      )}

      <p className="mt-2 flex items-start gap-1.5 text-sm text-muted">
        <Icon name="map-pin" className="mt-0.5 size-4 shrink-0" />
        <span>
          {pharmacy.address}
          {pharmacy.city && pharmacy.city !== pharmacy.address && !pharmacy.address.includes(pharmacy.city) && (
            <> · {pharmacy.city}</>
          )}
        </span>
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <PhoneLink phone={pharmacy.phone} variant="button" />
        <CallScriptButton
          medicationName={medication.name}
          genericName={medication.generic_name}
          form={medication.form}
          pharmacyName={pharmacy.name}
          phone={pharmacy.phone}
        />
        <button
          type="button"
          onClick={() => onSelect(pharmacy.id)}
          aria-pressed={isSelected}
          className={cn(
            BUTTON_BASE,
            "min-h-10 px-3",
            isSelected
              ? "bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200"
              : "text-ink-soft hover:bg-surface-2 hover:text-ink"
          )}
        >
          <Icon name="map" />
          {dict.pharmacies.showOnMap}
        </button>
      </div>

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
