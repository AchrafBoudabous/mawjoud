import Link from "next/link";
import { Disclaimer } from "@/components/Disclaimer";
import { PageContainer } from "@/components/PageContainer";
import { EmptyState } from "@/components/ui/EmptyState";
import { getDictionary } from "@/lib/i18n";
import { BUTTON_BASE, BUTTON_SECONDARY } from "@/lib/ui";

export default function NotFound() {
  const dict = getDictionary();
  return (
    <PageContainer>
      <Disclaimer />
      <EmptyState
        headingLevel={1}
        icon="map-pin"
        title={dict.pharmacies.emptyTitle}
        body={dict.governorate.pickSubtitle}
        action={
          <Link href="/pharmacies" className={`${BUTTON_BASE} ${BUTTON_SECONDARY}`}>
            {dict.governorate.change}
          </Link>
        }
      />
    </PageContainer>
  );
}
