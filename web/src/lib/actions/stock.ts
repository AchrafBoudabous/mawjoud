"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { medicationStockTag } from "@/lib/api";

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

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
  revalidateTag(medicationStockTag(slug));
  revalidatePath(`/medicaments/${slug}`);
}
