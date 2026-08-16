"use client";

import type { MapMarker } from "@/components/MapView";
import { MapView } from "@/components/MapView";
import type { ReportUiState } from "@/components/StockReportButtons";
import { REPORT_UI_IDLE, StockReportButtons } from "@/components/StockReportButtons";
import { StockReportTime } from "@/components/StockReportTime";
import { StockStatusBadge } from "@/components/StockStatusBadge";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import type { PatientReportStatus, PharmacyStock } from "@/lib/api";
import { formatPhone } from "@/lib/format";
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
      <>
        <strong>{p.name}</strong>
        <br />
        <StockStatusBadge status={p.status} />
        {p.verified && (
          <>
            {" "}
            <VerifiedBadge />
          </>
        )}
        {p.status !== "none" && p.reported_at && (
          <StockReportTime iso={p.reported_at} source={p.reported_by} />
        )}
        <br />
        <span>{p.address}</span>
        {p.phone && (
          <>
            <br />
            <a href={`tel:${p.phone}`}>{formatPhone(p.phone)}</a>
          </>
        )}
        <StockReportButtons
          pharmacyId={p.id}
          pharmacyName={p.name}
          state={reportUi[p.id] ?? REPORT_UI_IDLE}
          onReport={onReport}
          onReset={onResetReport}
          layout="column"
        />
      </>
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
