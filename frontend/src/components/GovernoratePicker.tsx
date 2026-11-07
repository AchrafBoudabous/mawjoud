"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import type { Governorate } from "@/lib/api";
import { nearestGovernorate } from "@/lib/geo";
import { getDictionary } from "@/lib/i18n";
import { getPreferredGovernorate, locate, setPreferredGovernorate, type GeoError } from "@/lib/prefs";
import { BUTTON_BASE, BUTTON_PRIMARY, BUTTON_SECONDARY, FIELD } from "@/lib/ui";
import { cn } from "@/lib/utils";

type GovernoratePickerProps = {
  governorates: Pick<Governorate, "slug" | "name_fr" | "name_ar" | "lat" | "lng">[];
  /** e.g. "/medicaments/levothyrox-50/" or "/pharmacies/". */
  basePath: string;
  className?: string;
};

/**
 * "Where are you looking?" — the remembered governorate (this device
 * only), "Près de moi", or a plain select. Près de moi resolves the
 * nearest governorate seat IN THE BROWSER; the destination page then
 * sorts by distance from the same cached position. Coordinates never
 * reach the server — only the governorate slug, in the URL.
 */
export function GovernoratePicker({ governorates, basePath, className }: GovernoratePickerProps) {
  const dict = getDictionary();
  const router = useRouter();
  const selectId = useId();
  const [remembered, setRemembered] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<GeoError | null>(null);

  useEffect(() => {
    setRemembered(getPreferredGovernorate());
  }, []);

  const rememberedGov = governorates.find((g) => g.slug === remembered) ?? null;

  function go(slug: string, near = false) {
    setPreferredGovernorate(slug);
    router.push(`${basePath}${slug}${near ? "?pres=1" : ""}`);
  }

  async function handleNearMe() {
    setGeoError(null);
    setLocating(true);
    try {
      const position = await locate();
      const nearest = nearestGovernorate(position, governorates);
      if (nearest) go(nearest.slug, true);
    } catch (err) {
      setGeoError((typeof err === "string" ? err : "unavailable") as GeoError);
    } finally {
      setLocating(false);
    }
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {rememberedGov && (
        <Link
          href={`${basePath}${rememberedGov.slug}`}
          className={cn(BUTTON_BASE, BUTTON_PRIMARY, "min-h-12 justify-between text-base animate-fade-in")}
        >
          <span className="inline-flex items-center gap-2">
            <Icon name="map-pin" />
            {dict.governorate.remembered(rememberedGov.name_fr)}
          </span>
          <Icon name="arrow-right" />
        </Link>
      )}

      <div className="grid gap-2 sm:grid-cols-[auto_1fr]">
        <button
          type="button"
          onClick={handleNearMe}
          disabled={locating}
          className={cn(BUTTON_BASE, rememberedGov ? BUTTON_SECONDARY : BUTTON_PRIMARY, "min-h-12")}
        >
          <Icon name={locating ? "loader" : "map-pin"} className={cn(locating && "animate-spin")} />
          {locating ? dict.governorate.locating : dict.governorate.nearMe}
        </button>

        <div>
          <label htmlFor={selectId} className="sr-only">
            {dict.governorate.selectLabel}
          </label>
          <select
            id={selectId}
            value=""
            onChange={(e) => e.target.value && go(e.target.value)}
            className={cn(FIELD, "cursor-pointer")}
          >
            <option value="" disabled>
              {rememberedGov ? dict.governorate.change : dict.governorate.selectLabel}
            </option>
            {governorates.map((g) => (
              <option key={g.slug} value={g.slug}>
                {g.name_fr} — {g.name_ar}
              </option>
            ))}
          </select>
        </div>
      </div>

      {geoError ? (
        <p role="alert" className="flex items-start gap-1.5 text-sm text-warn-text">
          <Icon name="alert" className="mt-0.5 size-4 shrink-0" />
          {dict.governorate.geoErrors[geoError]}
        </p>
      ) : (
        <p className="flex items-start gap-1.5 text-xs text-muted">
          <Icon name="shield-check" className="mt-px size-3.5 shrink-0" />
          {dict.governorate.nearMeHint}
        </p>
      )}
    </div>
  );
}
