import type { PharmacistAccountStatus } from "@/lib/api";
import { getDictionary } from "@/lib/i18n";

type AccountStatusBannerProps = {
  status: PharmacistAccountStatus;
};

/** Renders nothing when `active`. Otherwise the pending/rejected/suspended
 *  copy in a role="status" panel — this is how a `pending` account's
 *  read-only dashboard is made concrete rather than an error (5.2). */
export function AccountStatusBanner({ status }: AccountStatusBannerProps) {
  const dict = getDictionary();

  if (status === "active") {
    return null;
  }

  const copy =
    status === "pending"
      ? { title: dict.pharmacist.status.pendingTitle, body: dict.pharmacist.status.pendingBody }
      : status === "rejected"
        ? {
            title: dict.pharmacist.status.rejectedTitle,
            body: dict.pharmacist.status.rejectedBody,
          }
        : {
            title: dict.pharmacist.status.suspendedTitle,
            body: dict.pharmacist.status.suspendedBody,
          };

  return (
    <div
      role="status"
      className="rounded-lg border border-warn-border bg-warn-bg px-4 py-3 text-sm text-warn-text"
    >
      <p className="font-semibold">{copy.title}</p>
      <p className="mt-1">{copy.body}</p>
    </div>
  );
}
