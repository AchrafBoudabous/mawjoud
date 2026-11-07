"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { medicationStockTag } from "@/lib/api";

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** A Server Action is a public POST endpoint: anyone can call it in a
 *  loop. Unthrottled, each call purged the cache and forced the next
 *  page view to hit the free-tier Render API — a cheap way to keep the
 *  backend saturated. One purge per slug per window is plenty: the ISR
 *  window is 60 s anyway. Best-effort (per serverless instance), which
 *  is the right strength for a cache hint. */
const MIN_INTERVAL_MS = 5_000;
const MAX_TRACKED_SLUGS = 500;
const lastPurgeAt = new Map<string, number>();

/**
 * Purges the shared Next.js caches for one medication's stock results
 * after a successful report. This is the ONLY job of this action — no
 * database call, no FastAPI call, nothing else. See
 * docs/ARCHITECTURE.md 4.6 for why the write itself must NOT go through a
 * Server Action (it would collapse every patient's IP into Vercel's).
 */
export async function revalidateMedicationStock(slug: string): Promise<void> {
  if (typeof slug !== "string" || slug.length > 80 || !SLUG_PATTERN.test(slug)) {
    return;
  }

  const now = Date.now();
  const last = lastPurgeAt.get(slug);
  if (last !== undefined && now - last < MIN_INTERVAL_MS) {
    return;
  }
  if (lastPurgeAt.size >= MAX_TRACKED_SLUGS) {
    lastPurgeAt.clear();
  }
  lastPurgeAt.set(slug, now);

  revalidateTag(medicationStockTag(slug));
  revalidatePath(`/medicaments/${slug}`);
}
