"use client";

import type { MapMarker } from "@/components/MapView";
import { MapView } from "@/components/MapView";
import type { Pharmacy } from "@/lib/api";
import { formatPhone } from "@/lib/format";
import { getDictionary } from "@/lib/i18n";

type PharmacyMapProps = {
  pharmacies: Pharmacy[];
  selectedId: string | null;
  isVisible: boolean;
};

// #0f766e mirrors --color-brand-600 in web/src/app/globals.css — keep in sync.
const BRAND_PIN_COLOR = "#0f766e";

export function PharmacyMap({ pharmacies, selectedId, isVisible }: PharmacyMapProps) {
  const dict = getDictionary();

  const markers: MapMarker[] = pharmacies.map((p) => ({
    id: p.id,
    lat: p.lat,
    lng: p.lng,
    color: BRAND_PIN_COLOR,
    popup: (
      <>
        <strong>{p.name}</strong>
        <br />
        <span>{p.address}</span>
        {p.phone && (
          <>
            <br />
            <a href={`tel:${p.phone}`}>{formatPhone(p.phone)}</a>
          </>
        )}
      </>
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
