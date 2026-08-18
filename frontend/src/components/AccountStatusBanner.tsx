import { NoticeCard } from "@/components/ui/NoticeCard";
import type { PharmacistAccountStatus } from "@/lib/api";
import { getDictionary } from "@/lib/i18n";

type AccountStatusBannerProps = {
  status: PharmacistAccountStatus;
};

/** Renders nothing when `active`. `pending` is expected and reassuring —
 *  it means "we are calling your pharmacy" — so it gets the `info` tone;
 *  `rejected` / `suspended` are cautions and get `warn`. See
 *  docs/ARCHITECTURE.md 8.14 e6. */
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

  return status === "pending" ? (
    <NoticeCard tone="info" icon="info" role="status" title={copy.title}>
      {copy.body}
    </NoticeCard>
  ) : (
    <NoticeCard tone="warn" icon="alert" role="status" title={copy.title}>
      {copy.body}
    </NoticeCard>
  );
}
