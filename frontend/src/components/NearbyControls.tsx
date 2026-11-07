"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import type { LatLng } from "@/lib/geo";
import { getDictionary } from "@/lib/i18n";
import { locate, type GeoError } from "@/lib/prefs";
import { cn } from "@/lib/utils";

type NearbyControlsProps = {
  sorted: boolean;
  onPosition: (p: LatLng) => void;
  dutyOnly: boolean;
  onDutyOnlyChange: (v: boolean) => void;
};

const CHIP =
  "pressable inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold";

/** "Trier par distance" + "De garde / la nuit" filter chips. Distance is
 *  computed on the device from the browser's position; nothing is sent. */
export function NearbyControls({ sorted, onPosition, dutyOnly, onDutyOnlyChange }: NearbyControlsProps) {
  const dict = getDictionary();
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<GeoError | null>(null);

  async function sortByDistance() {
    setError(null);
    setLocating(true);
    try {
      onPosition(await locate());
    } catch (err) {
      setError((typeof err === "string" ? err : "unavailable") as GeoError);
    } finally {
      setLocating(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={sortByDistance}
          disabled={locating || sorted}
          aria-pressed={sorted}
          className={cn(
            CHIP,
            sorted
              ? "border-brand-300 bg-brand-50 text-brand-700"
              : "border-line bg-surface text-ink-soft shadow-card hover:border-brand-300"
          )}
        >
          <Icon name={locating ? "loader" : "map-pin"} className={cn("size-4", locating && "animate-spin")} />
          {sorted ? dict.nearby.sorted : locating ? dict.governorate.locating : dict.nearby.sortByDistance}
        </button>
        <button
          type="button"
          onClick={() => onDutyOnlyChange(!dutyOnly)}
          aria-pressed={dutyOnly}
          className={cn(
            CHIP,
            dutyOnly
              ? "border-ink bg-ink text-canvas"
              : "border-line bg-surface text-ink-soft shadow-card hover:border-brand-300"
          )}
        >
          <Icon name="moon" className="size-4" />
          {dict.nearby.filterDuty}
        </button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-warn-text">
          {dict.governorate.geoErrors[error]}
        </p>
      )}
    </div>
  );
}
