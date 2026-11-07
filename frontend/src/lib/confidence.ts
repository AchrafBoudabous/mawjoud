import type { PharmacyStock } from "@/lib/api";

export type ConfidenceLevel = "high" | "medium" | "low";

export type Confidence = {
  level: ConfidenceLevel;
  /** Distinct people (or the pharmacy) agreeing in the last 24 h. */
  agree: number;
  disagree: number;
  byPharmacy: boolean;
};

const HOUR = 60 * 60 * 1000;

/**
 * Turns "one latest report" into "how much should I trust it":
 *   high   — the pharmacy itself confirmed it in the last 24 h, or ≥ 3
 *            distinct people agree with nobody contradicting;
 *   medium — ≥ 2 people agree and agreement outweighs contradiction, or a
 *            single uncontested report under 6 h old;
 *   low    — everything else (a lone or old report, or contested).
 * Pure: `now` is passed in so SSR and the first client render agree.
 */
export function computeConfidence(p: PharmacyStock, now: number): Confidence | null {
  if (p.status === "none" || !p.reported_at) return null;

  const agree = p.confirmations_24h;
  const disagree = p.contradictions_24h;
  const byPharmacy = p.pharmacist_confirmed_24h;
  const ageMs = now - Date.parse(p.reported_at);

  let level: ConfidenceLevel = "low";
  if (byPharmacy || (agree >= 3 && disagree === 0)) {
    level = "high";
  } else if ((agree >= 2 && agree > disagree) || (agree <= 1 && disagree === 0 && ageMs < 6 * HOUR)) {
    level = "medium";
  }
  return { level, agree, disagree, byPharmacy };
}
