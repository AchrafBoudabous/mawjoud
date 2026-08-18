import { NoticeCard } from "@/components/ui/NoticeCard";
import { getDictionary } from "@/lib/i18n";

/** Replaces <Disclaimer /> on the /pharmacien* routes, in the same slot.
 *  Restates the community-data framing from the pharmacist's side rather
 *  than dropping it — deliberately the `info` tone, not `warn`, because
 *  this is informational rather than a caution. See
 *  docs/ARCHITECTURE.md 5.12.3. Every patient-facing route keeps
 *  <Disclaimer /> unchanged. */
export function PharmacistNotice() {
  const dict = getDictionary();

  return (
    <NoticeCard tone="info" icon="info" role="note">
      {dict.pharmacist.notice}
    </NoticeCard>
  );
}
