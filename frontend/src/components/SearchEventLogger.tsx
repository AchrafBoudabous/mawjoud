"use client";

import { useEffect, useRef } from "react";
import { logMedicationView } from "@/lib/api";

/** Renders nothing. Fires exactly one `POST /api/medications/{slug}/views`
 *  per real page load, directly to FastAPI (bypassing Next.js, same
 *  direct-to-backend pattern as step 4's report). The governorate scopes
 *  the pharmacist dashboard's "recherches près de chez vous". */
export function SearchEventLogger({ slug, governorate }: { slug: string; governorate?: string }) {
  const fired = useRef(false);

  useEffect(() => {
    // React StrictMode double-invokes effects in dev; without this guard
    // every local page view would count twice.
    if (fired.current) return;
    fired.current = true;
    void logMedicationView(slug, governorate).catch(() => {
      /* a metric must never surface an error on a patient's page */
    });
  }, [slug, governorate]);

  return null;
}
