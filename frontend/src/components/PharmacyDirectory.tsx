"use client";

import { useEffect, useMemo, useState } from "react";
import { NearbyControls } from "@/components/NearbyControls";
import { PharmacyList } from "@/components/PharmacyList";
import { PharmacyMap } from "@/components/PharmacyMap";
import { NoticeCard } from "@/components/ui/NoticeCard";
import { ViewToggle } from "@/components/ViewToggle";
import type { Governorate, Pharmacy } from "@/lib/api";
import { distanceKm, type LatLng } from "@/lib/geo";
import { getDictionary } from "@/lib/i18n";
import { getRecentPosition, setPreferredGovernorate } from "@/lib/prefs";

type PharmacyDirectoryProps = {
  pharmacies: Pharmacy[];
  governorate: Governorate;
};

export function PharmacyDirectory({ pharmacies, governorate }: PharmacyDirectoryProps) {
  const dict = getDictionary();
  const [view, setView] = useState<"list" | "map">("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [position, setPosition] = useState<LatLng | null>(null);
  const [dutyOnly, setDutyOnly] = useState(false);

  useEffect(() => {
    setPreferredGovernorate(governorate.slug);
    const params = new URLSearchParams(window.location.search);
    if (params.has("pres")) {
      const p = getRecentPosition();
      if (p) setPosition(p);
    }
    if (params.has("garde")) setDutyOnly(true);
  }, [governorate.slug]);

  const distances = useMemo(
    () => (position ? Object.fromEntries(pharmacies.map((p) => [p.id, distanceKm(position, p)])) : null),
    [pharmacies, position]
  );

  const visible = useMemo(() => {
    let list = dutyOnly ? pharmacies.filter((p) => p.on_duty_until || p.is_24h) : pharmacies;
    if (distances) list = [...list].sort((a, b) => distances[a.id] - distances[b.id]);
    else if (dutyOnly) list = [...list].sort((a, b) => Number(Boolean(b.on_duty_until)) - Number(Boolean(a.on_duty_until)));
    return list;
  }, [pharmacies, dutyOnly, distances]);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setView("map");
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-ink-soft tabular-nums">
          {dict.pharmacies.count(visible.length)}
        </p>
        <ViewToggle view={view} onChange={setView} className="w-full sm:w-auto md:hidden" />
      </div>

      <NearbyControls
        sorted={distances !== null}
        onPosition={setPosition}
        dutyOnly={dutyOnly}
        onDutyOnlyChange={setDutyOnly}
      />

      {dutyOnly && visible.length === 0 && (
        <NoticeCard tone="info" icon="moon">
          {dict.nearby.dutyEmpty}
        </NoticeCard>
      )}

      <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-6">
        <div
          className={`${view === "list" ? "block animate-fade-in" : "hidden"} md:block md:w-[42%] md:max-h-[calc(100dvh-7rem)] md:overflow-y-auto md:pr-1 md:[scrollbar-width:thin]`}
        >
          <PharmacyList
            pharmacies={visible}
            distances={distances}
            selectedId={selectedId}
            onSelect={handleSelect}
          />
        </div>

        <div
          className={`${view === "map" ? "block animate-fade-in" : "hidden"} md:block md:flex-1 md:sticky md:top-20`}
        >
          <PharmacyMap
            pharmacies={visible}
            selectedId={selectedId}
            isVisible={view === "map"}
            center={[governorate.lat, governorate.lng]}
            governorateName={governorate.name_fr}
            userPosition={position}
          />
        </div>
      </div>
    </div>
  );
}
