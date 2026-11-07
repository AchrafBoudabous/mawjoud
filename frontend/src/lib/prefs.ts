/**
 * Per-device conveniences only. Every access is wrapped: storage can be
 * missing or throw (private mode, blocked site data), and the app must
 * work exactly the same without it.
 */
import type { LatLng } from "@/lib/geo";

const GOV_KEY = "mawjoud:governorate";
const POS_KEY = "mawjoud:position";
const POS_MAX_AGE_MS = 15 * 60 * 1000;

export function getPreferredGovernorate(): string | null {
  try {
    const v = window.localStorage.getItem(GOV_KEY);
    return v && /^[a-z]+(-[a-z]+)*$/.test(v) ? v : null;
  } catch {
    return null;
  }
}

export function setPreferredGovernorate(slug: string): void {
  try {
    window.localStorage.setItem(GOV_KEY, slug);
  } catch {
    /* ignore */
  }
}

/** The last position, kept in sessionStorage (this tab only, 15 min) so
 *  a "Près de moi" tap survives the navigation to the governorate page.
 *  Never sent to any server. */
export function getRecentPosition(): LatLng | null {
  try {
    const raw = window.sessionStorage.getItem(POS_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as { lat: number; lng: number; at: number };
    if (Date.now() - v.at > POS_MAX_AGE_MS) return null;
    return { lat: v.lat, lng: v.lng };
  } catch {
    return null;
  }
}

export function setRecentPosition(p: LatLng): void {
  try {
    window.sessionStorage.setItem(POS_KEY, JSON.stringify({ ...p, at: Date.now() }));
  } catch {
    /* ignore */
  }
}

export type GeoError = "unsupported" | "denied" | "unavailable";

/** One-shot, coarse-enough position. Resolves from the 15-min cache when
 *  possible so the browser does not re-prompt on every page. */
export function locate(): Promise<LatLng> {
  const cached = getRecentPosition();
  if (cached) return Promise.resolve(cached);
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject("unsupported" satisfies GeoError);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setRecentPosition(p);
        resolve(p);
      },
      (err) => reject((err.code === err.PERMISSION_DENIED ? "denied" : "unavailable") satisfies GeoError),
      { enableHighAccuracy: false, timeout: 12_000, maximumAge: 5 * 60 * 1000 }
    );
  });
}
