import { getDictionary } from "@/lib/i18n";

/** Replaces <Disclaimer /> on the /pharmacien* routes, in the same slot.
 *  Restates the community-data framing from the pharmacist's side rather
 *  than dropping it — deliberately NOT the amber warn-* tokens, because
 *  this is informational rather than a caution. See
 *  docs/ARCHITECTURE.md 5.12.3. Every patient-facing route keeps
 *  <Disclaimer /> unchanged. */
export function PharmacistNotice() {
  const dict = getDictionary();

  return (
    <p
      role="note"
      className="rounded-lg border border-brand-600/20 bg-brand-50 px-4 py-3 text-sm text-ink"
    >
      {dict.pharmacist.notice}
    </p>
  );
}
