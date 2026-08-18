"use client";

import dynamic from "next/dynamic";
import type { MapMarker } from "@/components/MapViewInner";
import { MapSkeleton } from "@/components/skeletons/MapSkeleton";
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
  return <MapSkeleton label={dict.pharmacies.mapLoading} />;
}

const MapViewInner = dynamic(() => import("./MapViewInner"), {
  ssr: false,
  loading: MapPlaceholder,
});

export function MapView(props: MapViewProps) {
  return <MapViewInner {...props} />;
}
