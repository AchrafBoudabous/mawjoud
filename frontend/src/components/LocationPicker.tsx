"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { LatLngValue } from "@/components/LocationPickerInner";
import { MapSkeleton } from "@/components/skeletons/MapSkeleton";
import { Icon } from "@/components/ui/Icon";
import { getDictionary } from "@/lib/i18n";
import { locate, type GeoError } from "@/lib/prefs";
import { BUTTON_BASE, BUTTON_SECONDARY } from "@/lib/ui";
import { cn } from "@/lib/utils";

export type { LatLngValue } from "@/components/LocationPickerInner";

const Inner = dynamic(() => import("./LocationPickerInner"), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

type LocationPickerProps = {
  center: [number, number];
  value: LatLngValue | null;
  onChange: (v: LatLngValue) => void;
};

/** Tap the map (or drag the pin) to place a proposed pharmacy; or use the
 *  device position — the registrant is often standing in the pharmacy. */
export function LocationPicker({ center, value, onChange }: LocationPickerProps) {
  const dict = getDictionary();
  const t = dict.pharmacist.register;
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<GeoError | null>(null);

  async function useMine() {
    setError(null);
    setLocating(true);
    try {
      onChange(await locate());
    } catch (err) {
      setError((typeof err === "string" ? err : "unavailable") as GeoError);
    } finally {
      setLocating(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Inner center={center} value={value} onChange={onChange} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted tabular-nums">
          {value ? t.locationSet(value.lat.toFixed(5), value.lng.toFixed(5)) : t.locationHint}
        </p>
        <button type="button" onClick={useMine} disabled={locating} className={cn(BUTTON_BASE, BUTTON_SECONDARY, "min-h-9")}>
          <Icon name={locating ? "loader" : "map-pin"} className={cn(locating && "animate-spin")} />
          {t.useMyPosition}
        </button>
      </div>
      {error && <p role="alert" className="text-sm text-warn-text">{dict.governorate.geoErrors[error]}</p>}
    </div>
  );
}
