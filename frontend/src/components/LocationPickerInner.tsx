"use client";

import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { useEffect, useMemo } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { OSM_MAX_ZOOM, OSM_TILE_URL } from "@/lib/geo";
import { getDictionary } from "@/lib/i18n";

export type LatLngValue = { lat: number; lng: number };

type LocationPickerInnerProps = {
  center: [number, number];
  value: LatLngValue | null;
  onChange: (v: LatLngValue) => void;
};

function ClickToPlace({ onChange }: { onChange: (v: LatLngValue) => void }) {
  useMapEvents({
    click(e) {
      onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function Recenter({ center, value }: { center: [number, number]; value: LatLngValue | null }) {
  const map = useMap();
  useEffect(() => {
    if (value) map.setView([value.lat, value.lng], Math.max(map.getZoom(), 16));
  }, [value, map]);
  useEffect(() => {
    if (!value) map.setView(center, 12);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the governorate changes
  }, [center[0], center[1], map]);
  return null;
}

export default function LocationPickerInner({ center, value, onChange }: LocationPickerInnerProps) {
  const dict = getDictionary();
  const icon = useMemo(
    () =>
      L.divIcon({
        className: "mawjoud-marker",
        html: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 40" width="30" height="40" aria-hidden="true"><path d="M15 1C7.3 1 1 7.2 1 14.9 1 25.2 15 39 15 39s14-13.8 14-24.1C29 7.2 22.7 1 15 1z" fill="#0b7a6a" stroke="#ffffff" stroke-width="2"/><path d="M15 9.5v10M10 14.5h10" stroke="#ffffff" stroke-width="2.6" stroke-linecap="round"/></svg>',
        iconSize: [30, 40],
        iconAnchor: [15, 39],
      }),
    []
  );

  return (
    <div className="h-72 w-full overflow-hidden rounded-card border border-line">
      <MapContainer center={center} zoom={12} className="h-full w-full" scrollWheelZoom={false}>
        <TileLayer url={OSM_TILE_URL} maxZoom={OSM_MAX_ZOOM} attribution={dict.pharmacies.osmAttribution} />
        <ClickToPlace onChange={onChange} />
        <Recenter center={center} value={value} />
        {value && (
          <Marker
            position={[value.lat, value.lng]}
            icon={icon}
            draggable
            eventHandlers={{
              dragend: (e) => {
                const ll = (e.target as L.Marker).getLatLng();
                onChange({ lat: ll.lat, lng: ll.lng });
              },
            }}
          />
        )}
      </MapContainer>
    </div>
  );
}
