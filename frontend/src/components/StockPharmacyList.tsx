import type { ReportUiState } from "@/components/StockReportButtons";
import { StockPharmacyListItem } from "@/components/StockPharmacyListItem";
import type { Medication, PatientReportStatus, PharmacyStock } from "@/lib/api";

type StockPharmacyListProps = {
  pharmacies: PharmacyStock[];
  medication: Medication;
  /** km per pharmacy id, when the user asked to sort by distance. */
  distances: Record<string, number> | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  reportUi: Record<string, ReportUiState>;
  onReport: (pharmacyId: string, status: PatientReportStatus) => void;
  onResetReport: (pharmacyId: string) => void;
};

export function StockPharmacyList({
  pharmacies,
  medication,
  distances,
  selectedId,
  onSelect,
  reportUi,
  onReport,
  onResetReport,
}: StockPharmacyListProps) {
  return (
    <ul className="flex flex-col gap-3">
      {pharmacies.map((pharmacy) => (
        <StockPharmacyListItem
          key={pharmacy.id}
          pharmacy={pharmacy}
          medication={medication}
          distanceKm={distances?.[pharmacy.id] ?? null}
          isSelected={pharmacy.id === selectedId}
          onSelect={onSelect}
          reportState={reportUi[pharmacy.id]}
          onReport={onReport}
          onResetReport={onResetReport}
        />
      ))}
    </ul>
  );
}
