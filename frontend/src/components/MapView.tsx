"use client";

import dynamic from "next/dynamic";
import type { MapMarker } from "@/components/MapViewInner";
import { getDictionary } from "@/lib/i18n";

export type { MapMarker } from "@/components/MapViewInner";

type MapViewProps = {
  markers: MapMarker[];
  selectedId: string | null;
  isVisible: boolean;
  ariaLabel: string;
};

function MapPlaceholder() {
  const dict = getDictionary();
  return (
    <div className="flex h-[60vh] min-h-80 w-full items-center justify-center rounded-lg border text-sm text-muted md:h-[70vh]">
      {dict.pharmacies.mapLoading}
    </div>
  );
}

const MapViewInner = dynamic(() => import("./MapViewInner"), {
  ssr: false,
  loading: MapPlaceholder,
});

export function MapView(props: MapViewProps) {
  return <MapViewInner {...props} />;
}
