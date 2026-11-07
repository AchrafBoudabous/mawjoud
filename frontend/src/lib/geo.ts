export const BIZERTE_CENTER: [number, number] = [37.2744, 9.8739];
export const BIZERTE_DEFAULT_ZOOM = 13;
export const BIZERTE_FOCUS_ZOOM = 16;
export const TUNISIA_CENTER: [number, number] = [34.0, 9.6];
export const TUNISIA_ZOOM = 6;
export const OSM_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
export const OSM_MAX_ZOOM = 19;

export type LatLng = { lat: number; lng: number };

/** Great-circle distance in kilometres (haversine). */
export function distanceKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Closest governorate seat to a position. Runs in the browser only: the
 *  user's coordinates never leave the device. */
export function nearestGovernorate<T extends LatLng>(position: LatLng, governorates: T[]): T | null {
  let best: T | null = null;
  let bestKm = Number.POSITIVE_INFINITY;
  for (const g of governorates) {
    const km = distanceKm(position, g);
    if (km < bestKm) {
      best = g;
      bestKm = km;
    }
  }
  return best;
}

/** "350 m" | "1,2 km" | "18 km" — French decimal comma. */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.max(50, Math.round((km * 1000) / 50) * 50)} m`;
  if (km < 10) return `${km.toFixed(1).replace(".", ",")} km`;
  return `${Math.round(km)} km`;
}
