import type { ReportUiState } from "@/components/StockReportButtons";
import { StockPharmacyListItem } from "@/components/StockPharmacyListItem";
import type { PatientReportStatus, PharmacyStock } from "@/lib/api";

type StockPharmacyListProps = {
  pharmacies: PharmacyStock[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  reportUi: Record<string, ReportUiState>;
  onReport: (pharmacyId: string, status: PatientReportStatus) => void;
  onResetReport: (pharmacyId: string) => void;
};

export function StockPharmacyList({
  pharmacies,
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
