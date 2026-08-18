"use client";

import type { MapMarker } from "@/components/MapView";
import { MapView } from "@/components/MapView";
import type { ReportUiState } from "@/components/StockReportButtons";
import { REPORT_UI_IDLE, StockReportButtons } from "@/components/StockReportButtons";
import { StockReportTime } from "@/components/StockReportTime";
import { StockStatusBadge } from "@/components/StockStatusBadge";
import { PhoneLink } from "@/components/ui/PhoneLink";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import type { PatientReportStatus, PharmacyStock } from "@/lib/api";
import { getDictionary } from "@/lib/i18n";
import { STOCK_STYLES } from "@/lib/stock";

type StockMapProps = {
  pharmacies: PharmacyStock[];
  selectedId: string | null;
  isVisible: boolean;
  medicationName: string;
  reportUi: Record<string, ReportUiState>;
  onReport: (pharmacyId: string, status: PatientReportStatus) => void;
  onResetReport: (pharmacyId: string) => void;
};

export function StockMap({
  pharmacies,
  selectedId,
  isVisible,
  medicationName,
  reportUi,
  onReport,
  onResetReport,
}: StockMapProps) {
  const dict = getDictionary();

  const markers: MapMarker[] = pharmacies.map((p) => ({
    id: p.id,
    lat: p.lat,
    lng: p.lng,
    color: STOCK_STYLES[p.status].pin,
    popup: (
      <div className="mawjoud-popup flex w-full flex-col gap-2">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-ink">{p.name}</p>
          <div className="flex flex-wrap items-center gap-1.5">
            <StockStatusBadge status={p.status} />
            {p.verified && <VerifiedBadge />}
          </div>
        </div>
        {p.status !== "none" && p.reported_at && (
          <StockReportTime iso={p.reported_at} source={p.reported_by} />
        )}
        <p className="text-xs text-muted">{p.address}</p>
        <PhoneLink phone={p.phone} />
        <StockReportButtons
          pharmacyId={p.id}
          pharmacyName={p.name}
          state={reportUi[p.id] ?? REPORT_UI_IDLE}
          onReport={onReport}
          onReset={onResetReport}
          layout="column"
        />
      </div>
    ),
  }));

  return (
    <MapView
      markers={markers}
      selectedId={selectedId}
      isVisible={isVisible}
      ariaLabel={dict.stock.mapAriaLabel(medicationName)}
    />
  );
}
