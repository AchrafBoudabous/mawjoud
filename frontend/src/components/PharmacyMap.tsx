"use client";

import type { MapMarker } from "@/components/MapView";
import { MapView } from "@/components/MapView";
import { PhoneLink } from "@/components/ui/PhoneLink";
import type { Pharmacy } from "@/lib/api";
import { getDictionary } from "@/lib/i18n";

type PharmacyMapProps = {
  pharmacies: Pharmacy[];
  selectedId: string | null;
  isVisible: boolean;
};

// #0f766e mirrors --color-brand-600 in frontend/src/app/globals.css — keep in sync.
const BRAND_PIN_COLOR = "#0f766e";

export function PharmacyMap({ pharmacies, selectedId, isVisible }: PharmacyMapProps) {
  const dict = getDictionary();

  const markers: MapMarker[] = pharmacies.map((p) => ({
    id: p.id,
    lat: p.lat,
    lng: p.lng,
    color: BRAND_PIN_COLOR,
    popup: (
      <div className="mawjoud-popup flex w-full flex-col gap-2">
        <p className="text-sm font-semibold text-ink">{p.name}</p>
        <p className="text-xs text-muted">{p.address}</p>
        <PhoneLink phone={p.phone} />
      </div>
    ),
  }));

  return (
    <MapView
      markers={markers}
      selectedId={selectedId}
      isVisible={isVisible}
      ariaLabel={dict.pharmacies.mapAriaLabel}
    />
  );
}
