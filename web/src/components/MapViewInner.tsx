"use client";

import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import {
  BIZERTE_CENTER,
  BIZERTE_DEFAULT_ZOOM,
  BIZERTE_FOCUS_ZOOM,
  OSM_MAX_ZOOM,
  OSM_TILE_URL,
} from "@/lib/geo";
import { getDictionary } from "@/lib/i18n";

export type MapMarker = {
  id: string;
  lat: number;
  lng: number;
  /** Hex fill for the pin SVG. */
  color: string;
  popup: React.ReactNode;
};

type MapViewInnerProps = {
  markers: MapMarker[];
  selectedId: string | null;
  isVisible: boolean;
  ariaLabel: string;
};

function makeMarkerIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: "mawjoud-marker",
    html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 32" width="24" height="32" aria-hidden="true"><path d="M12 0C5.4 0 0 5.4 0 12c0 8.4 12 20 12 20s12-11.6 12-20C24 5.4 18.6 0 12 0z" fill="${color}"/><circle cx="12" cy="12" r="4.5" fill="#ffffff"/></svg>`,
    iconSize: [24, 32],
    iconAnchor: [12, 32],
    popupAnchor: [0, -30],
  });
}

function FlyToSelected({
  selectedId,
  markers,
}: {
  selectedId: string | null;
  markers: MapMarker[];
}) {
  const map = useMap();
  useEffect(() => {
    if (!selectedId) return;
    const m = markers.find((x) => x.id === selectedId);
    if (m) map.flyTo([m.lat, m.lng], BIZERTE_FOCUS_ZOOM);
  }, [selectedId, markers, map]);
  return null;
}

function InvalidateSizeOnShow({ isVisible }: { isVisible: boolean }) {
  const map = useMap();

  useEffect(() => {
    if (!isVisible) return;
    const t = setTimeout(() => map.invalidateSize(), 0);
    return () => clearTimeout(t);
  }, [isVisible, map]);

  useEffect(() => {
    map.invalidateSize();
  }, [map]);

  return null;
}

export default function MapViewInner({
  markers,
  selectedId,
  isVisible,
  ariaLabel,
}: MapViewInnerProps) {
  const dict = getDictionary();

  const icons = useMemo(() => {
    const cache = new Map<string, L.DivIcon>();
    for (const m of markers) {
      if (!cache.has(m.color)) cache.set(m.color, makeMarkerIcon(m.color));
    }
    return cache;
  }, [markers]);

  const framingProps =
    markers.length > 0
      ? {
          bounds: L.latLngBounds(markers.map((m) => [m.lat, m.lng] as [number, number])),
          boundsOptions: { padding: [24, 24] as [number, number], maxZoom: 15 },
        }
      : {
          center: BIZERTE_CENTER,
          zoom: BIZERTE_DEFAULT_ZOOM,
        };

  return (
    <div
      role="region"
      aria-label={ariaLabel}
      className="h-[60vh] min-h-80 w-full overflow-hidden rounded-lg border md:h-[70vh]"
    >
      <MapContainer className="h-full w-full" scrollWheelZoom={false} {...framingProps}>
        <TileLayer
          url={OSM_TILE_URL}
          maxZoom={OSM_MAX_ZOOM}
          attribution={dict.pharmacies.osmAttribution}
        />
        {markers.map((m) => (
          <Marker key={m.id} position={[m.lat, m.lng]} icon={icons.get(m.color)}>
            <Popup>{m.popup}</Popup>
          </Marker>
        ))}
        <FlyToSelected selectedId={selectedId} markers={markers} />
        <InvalidateSizeOnShow isVisible={isVisible} />
      </MapContainer>
    </div>
  );
}
