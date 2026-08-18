import { VerifiedBadge } from "@/components/VerifiedBadge";
import { PhoneLink } from "@/components/ui/PhoneLink";
import type { Pharmacy } from "@/lib/api";
import { getDictionary } from "@/lib/i18n";
import { BUTTON_BASE, BUTTON_SECONDARY, CARD_INTERACTIVE } from "@/lib/ui";

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
      className={`cursor-pointer p-4 ${CARD_INTERACTIVE} ${
        isSelected ? "border-brand-600 ring-1 ring-brand-600" : ""
      }`}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <h3 className="font-semibold text-ink">{pharmacy.name}</h3>
        {pharmacy.verified && (
          <div className="self-start">
            <VerifiedBadge />
          </div>
        )}
      </div>
      <p className="mt-1 text-sm text-muted">{pharmacy.address}</p>
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
    </li>
  );
}
