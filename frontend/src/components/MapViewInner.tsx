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
  /** Fallback framing when there are no markers (the governorate seat). */
  center?: [number, number];
  /** The user's own position, shown as a dot. Never leaves the browser. */
  userPosition?: { lat: number; lng: number } | null;
};

function makeUserIcon(): L.DivIcon {
  return L.divIcon({
    className: "mawjoud-marker",
    html: '<span class="mawjoud-user-dot" aria-hidden="true"></span>',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

function makeMarkerIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: "mawjoud-marker",
    // `color` only ever comes from the fixed STOCK_STYLES / brand hex
    // constants, never from API data, so interpolating it is safe.
    html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 40" width="30" height="40" aria-hidden="true"><path d="M15 1C7.3 1 1 7.2 1 14.9 1 25.2 15 39 15 39s14-13.8 14-24.1C29 7.2 22.7 1 15 1z" fill="${color}" stroke="#ffffff" stroke-width="2"/><path d="M15 9.5v10M10 14.5h10" stroke="#ffffff" stroke-width="2.6" stroke-linecap="round"/></svg>`,
    iconSize: [30, 40],
    iconAnchor: [15, 39],
    popupAnchor: [0, -36],
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
  center = BIZERTE_CENTER,
  userPosition = null,
}: MapViewInnerProps) {
  const userIcon = useMemo(() => makeUserIcon(), []);
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
          center,
          zoom: BIZERTE_DEFAULT_ZOOM - 1,
        };

  return (
    <div
      role="region"
      aria-label={ariaLabel}
      className="h-[62vh] min-h-80 w-full overflow-hidden rounded-panel border border-line shadow-raised md:h-[calc(100dvh-7rem)]"
    >
      <MapContainer className="h-full w-full" scrollWheelZoom={false} {...framingProps}>
        <TileLayer
          url={OSM_TILE_URL}
          maxZoom={OSM_MAX_ZOOM}
          attribution={dict.pharmacies.osmAttribution}
        />
        {markers.map((m) => (
          <Marker key={m.id} position={[m.lat, m.lng]} icon={icons.get(m.color)}>
            <Popup maxWidth={280} minWidth={220}>
              {m.popup}
            </Popup>
          </Marker>
        ))}
        {userPosition && (
          <Marker
            position={[userPosition.lat, userPosition.lng]}
            icon={userIcon}
            interactive={false}
            keyboard={false}
            zIndexOffset={1000}
          />
        )}
        <FlyToSelected selectedId={selectedId} markers={markers} />
        <InvalidateSizeOnShow isVisible={isVisible} />
      </MapContainer>
    </div>
  );
}
