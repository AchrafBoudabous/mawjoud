import Link from "next/link";
import { Disclaimer } from "@/components/Disclaimer";
import { PageContainer } from "@/components/PageContainer";
import { EmptyState } from "@/components/ui/EmptyState";
import { BUTTON_BASE, BUTTON_SECONDARY } from "@/lib/ui";
import { getDictionary } from "@/lib/i18n";

export default function NotFound() {
  const dict = getDictionary();

  return (
    <PageContainer>

      <Disclaimer />

      <EmptyState
        headingLevel={1}
        icon="search"
        title={dict.stock.notFoundTitle}
        body={dict.stock.notFoundBody}
        action={
          <Link href="/" className={`${BUTTON_BASE} ${BUTTON_SECONDARY}`}>
            {dict.common.backHome}
          </Link>
        }
      />

    </PageContainer>
  );
}
