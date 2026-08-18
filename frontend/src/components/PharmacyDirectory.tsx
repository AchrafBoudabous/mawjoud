"use client";

import { useState } from "react";
import type { Pharmacy } from "@/lib/api";
import { getDictionary } from "@/lib/i18n";
import { PharmacyList } from "@/components/PharmacyList";
import { PharmacyMap } from "@/components/PharmacyMap";
import { ViewToggle } from "@/components/ViewToggle";

type PharmacyDirectoryProps = {
  pharmacies: Pharmacy[];
};

export function PharmacyDirectory({ pharmacies }: PharmacyDirectoryProps) {
  const dict = getDictionary();
  const [view, setView] = useState<"list" | "map">("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setView("map");
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 sm:flex-row">
        <p className="text-sm text-muted tabular-nums">{dict.pharmacies.count(pharmacies.length)}</p>
        <ViewToggle view={view} onChange={setView} className="w-full sm:w-auto md:hidden" />
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-6">
        <div
          className={`${view === "list" ? "block animate-fade-in" : "hidden"} md:block md:w-2/5 md:max-h-[70vh] md:overflow-y-auto`}
        >
          <PharmacyList
            pharmacies={pharmacies}
            selectedId={selectedId}
            onSelect={handleSelect}
          />
        </div>

        <div
          className={`${view === "map" ? "block animate-fade-in" : "hidden"} md:block md:w-3/5 md:sticky md:top-4`}
        >
          <PharmacyMap
            pharmacies={pharmacies}
            selectedId={selectedId}
            isVisible={view === "map"}
          />
        </div>
      </div>
    </div>
  );
}
