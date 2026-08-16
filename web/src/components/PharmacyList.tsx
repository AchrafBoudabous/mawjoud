import type { Pharmacy } from "@/lib/api";
import { PharmacyListItem } from "@/components/PharmacyListItem";

type PharmacyListProps = {
  pharmacies: Pharmacy[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function PharmacyList({
  pharmacies,
  selectedId,
  onSelect,
}: PharmacyListProps) {
  return (
    <ul className="flex flex-col gap-3">
      {pharmacies.map((pharmacy) => (
        <PharmacyListItem
          key={pharmacy.id}
          pharmacy={pharmacy}
          isSelected={pharmacy.id === selectedId}
          onSelect={onSelect}
        />
      ))}
    </ul>
  );
}
