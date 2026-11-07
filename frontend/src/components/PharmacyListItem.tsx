import { DutyBadge } from "@/components/DutyBadge";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { Icon } from "@/components/ui/Icon";
import { PhoneLink } from "@/components/ui/PhoneLink";
import type { Pharmacy } from "@/lib/api";
import { formatDistance } from "@/lib/geo";
import { getDictionary } from "@/lib/i18n";
import { BUTTON_BASE } from "@/lib/ui";
import { cn } from "@/lib/utils";

type PharmacyListItemProps = {
  pharmacy: Pharmacy;
  distanceKm: number | null;
  isSelected: boolean;
  onSelect: (id: string) => void;
};

export function PharmacyListItem({ pharmacy, distanceKm, isSelected, onSelect }: PharmacyListItemProps) {
  const dict = getDictionary();
  const showCity = pharmacy.city && pharmacy.city !== pharmacy.address && !pharmacy.address.includes(pharmacy.city);

  return (
    <li
      className={cn(
        "rounded-card border bg-surface p-4 shadow-card transition-[border-color,box-shadow] duration-200 ease-standard hover:shadow-raised",
        isSelected ? "border-brand-500 ring-2 ring-brand-500/25" : "border-line"
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-control bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-100">
          <Icon name="pharmacy" className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 dir="auto" className="text-base font-bold text-ink">
            {pharmacy.name}
          </h3>
          {pharmacy.name_ar && (
            <p dir="rtl" lang="ar" className="text-sm text-muted">
              {pharmacy.name_ar}
            </p>
          )}
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
          <p dir="auto" className="mt-1 text-sm text-muted">
            {pharmacy.address}
            {showCity && <> · {pharmacy.city}</>}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <PhoneLink phone={pharmacy.phone} variant="button" />
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
    </li>
  );
}
