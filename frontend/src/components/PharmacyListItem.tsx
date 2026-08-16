import { VerifiedBadge } from "@/components/VerifiedBadge";
import type { Pharmacy } from "@/lib/api";
import { formatPhone } from "@/lib/format";
import { getDictionary } from "@/lib/i18n";

type PharmacyListItemProps = {
  pharmacy: Pharmacy;
  isSelected: boolean;
  onSelect: (id: string) => void;
};

export function PharmacyListItem({
  pharmacy,
  isSelected,
  onSelect,
}: PharmacyListItemProps) {
  const dict = getDictionary();

  return (
    <li
      onClick={() => onSelect(pharmacy.id)}
      className={`cursor-pointer rounded-lg border bg-surface p-4 ${
        isSelected
          ? "border-brand-600 ring-1 ring-brand-600"
          : "border-gray-200"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-ink">{pharmacy.name}</h3>
        {pharmacy.verified && <VerifiedBadge />}
      </div>
      <p className="text-sm text-muted">{pharmacy.address}</p>
      {pharmacy.city !== "Bizerte" && (
        <p className="text-sm text-muted">{pharmacy.city}</p>
      )}
      {pharmacy.phone ? (
        <p className="mt-2 text-sm">
          <span className="text-muted">{dict.pharmacies.call} : </span>
          <a
            href={`tel:${pharmacy.phone}`}
            onClick={(e) => e.stopPropagation()}
            className="text-brand-600 underline"
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
    </li>
  );
}
