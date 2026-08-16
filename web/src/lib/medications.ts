import type { MedicationCategory } from "@/lib/api";

/** Display order of the browse list; also the API's `order("category")` is
 *  alphabetical, so the frontend re-orders rather than relying on it. */
export const CATEGORY_ORDER = [
  "thyroid",
  "insulin",
  "psychiatric",
  "cancer_pain",
] as const satisfies readonly MedicationCategory[];
