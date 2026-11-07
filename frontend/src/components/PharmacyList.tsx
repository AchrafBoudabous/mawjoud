import type { Pharmacy } from "@/lib/api";
import { PharmacyListItem } from "@/components/PharmacyListItem";

type PharmacyListProps = {
  pharmacies: Pharmacy[];
  distances: Record<string, number> | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function PharmacyList({ pharmacies, distances, selectedId, onSelect }: PharmacyListProps) {
  return (
    <ul className="flex flex-col gap-3">
      {pharmacies.map((pharmacy) => (
        <PharmacyListItem
          key={pharmacy.id}
          pharmacy={pharmacy}
          distanceKm={distances?.[pharmacy.id] ?? null}
          isSelected={pharmacy.id === selectedId}
          onSelect={onSelect}
        />
      ))}
    </ul>
  );
}
