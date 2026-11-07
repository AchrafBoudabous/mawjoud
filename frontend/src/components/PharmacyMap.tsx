"use client";

import type { MapMarker } from "@/components/MapView";
import { MapView } from "@/components/MapView";
import { DutyBadge } from "@/components/DutyBadge";
import { PhoneLink } from "@/components/ui/PhoneLink";
import type { Pharmacy } from "@/lib/api";
import { getDictionary } from "@/lib/i18n";

type PharmacyMapProps = {
  pharmacies: Pharmacy[];
  selectedId: string | null;
  isVisible: boolean;
  center: [number, number];
  governorateName: string;
  userPosition: { lat: number; lng: number } | null;
};

// #0f766e mirrors --color-brand-600 in frontend/src/app/globals.css — keep in sync.
const BRAND_PIN_COLOR = "#0f766e";

export function PharmacyMap({
  pharmacies,
  selectedId,
  isVisible,
  center,
  governorateName,
  userPosition,
}: PharmacyMapProps) {
  const dict = getDictionary();

  const markers: MapMarker[] = pharmacies.map((p) => ({
    id: p.id,
    lat: p.lat,
    lng: p.lng,
    color: BRAND_PIN_COLOR,
    popup: (
      <div className="mawjoud-popup flex w-full flex-col gap-2">
        <p dir="auto" className="text-sm font-semibold text-ink">{p.name}</p>
        <DutyBadge onDutyUntil={p.on_duty_until} is24h={p.is_24h} />
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
      center={center}
      userPosition={userPosition}
      ariaLabel={dict.pharmacies.mapAriaLabel(governorateName)}
    />
  );
}
