import type { Dictionary } from "@/lib/i18n";
import { STALE_AFTER_HOURS } from "@/lib/stock";

const TN_PHONE_RE = /^\+216\d{8}$/;

/**
 * "+21672431210" -> "+216 72 431 210". Returns the input unchanged if it
 * does not match the canonical E.164 Tunisian shape rather than throwing —
 * `phone` is user-facing display formatting, not validation.
 */
export function formatPhone(phone: string): string {
  if (!TN_PHONE_RE.test(phone)) {
    return phone;
  }

  const national = phone.slice(4); // strip "+216"
  return `+216 ${national.slice(0, 2)} ${national.slice(2, 5)} ${national.slice(5, 8)}`;
}

/** Tunisia is UTC+1 all year (no DST since 2009). Hard-coding the offset
 *  keeps server and client output byte-identical without Intl. */
export const TUNIS_UTC_OFFSET_MINUTES = 60;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** ISO timestamp -> its date/time parts in the fixed Tunisia offset,
 *  computed with UTC getters only so the result never depends on the
 *  server's or browser's local timezone. */
function toTunisParts(iso: string) {
  const utcMs = new Date(iso).getTime();
  const tunis = new Date(utcMs + TUNIS_UTC_OFFSET_MINUTES * 60_000);
  return {
    day: tunis.getUTCDate(),
    month: tunis.getUTCMonth() + 1,
    year: tunis.getUTCFullYear(),
    hours: tunis.getUTCHours(),
    minutes: tunis.getUTCMinutes(),
  };
}

/** "14/08/2026 à 09:30" — deterministic, no Intl, no locale data. */
export function formatAbsoluteDateTime(iso: string): string {
  const { day, month, year, hours, minutes } = toTunisParts(iso);
  return `${pad2(day)}/${pad2(month)}/${year} à ${pad2(hours)}:${pad2(minutes)}`;
}

/** "à l'instant" | "il y a 12 minutes" | "il y a 3 heures" | "il y a 5 jours"
 *  | "le 14/08/2026 à 09:30" (≥ 30 days). A future timestamp (clock skew)
 *  renders as `justNow`, never a negative number. */
export function formatRelativeTime(
  iso: string,
  now: number,
  t: Dictionary["time"]
): string {
  const then = new Date(iso).getTime();
  const diffSeconds = Math.floor((now - then) / 1000);

  if (diffSeconds < 60) {
    return t.justNow;
  }

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return t.minutes(diffMinutes);
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return t.hours(diffHours);
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) {
    return t.days(diffDays);
  }

  return t.onDate(formatAbsoluteDateTime(iso));
}

/** true when the report is older than STALE_AFTER_HOURS. */
export function isStaleReport(iso: string, now: number): boolean {
  const then = new Date(iso).getTime();
  const diffHours = (now - then) / (1000 * 60 * 60);
  return diffHours > STALE_AFTER_HOURS;
}

/** "20:00" in Tunis time. */
export function formatTunisTime(iso: string): string {
  const { hours, minutes } = toTunisParts(iso);
  return `${pad2(hours)}:${pad2(minutes)}`;
}

/** "14/08" in Tunis time. */
export function formatTunisDayMonth(iso: string): string {
  const { day, month } = toTunisParts(iso);
  return `${pad2(day)}/${pad2(month)}`;
}

/** Date + time typed by a pharmacist (always Tunis wall-clock time) ->
 *  an ISO string with an explicit +01:00 offset, which the API requires. */
export function tunisLocalToIso(date: string, time: string): string {
  return `${date}T${time}:00+01:00`;
}

/** Today's date in Tunis as YYYY-MM-DD (for <input type="date">). */
export function tunisToday(now: number = Date.now(), addDays = 0): string {
  const d = new Date(now + TUNIS_UTC_OFFSET_MINUTES * 60_000 + addDays * 86_400_000);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}
