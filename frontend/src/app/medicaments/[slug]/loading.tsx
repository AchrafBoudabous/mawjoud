import { Disclaimer } from "@/components/Disclaimer";
import { PageContainer } from "@/components/PageContainer";
import { SearchFieldSkeleton } from "@/components/skeletons/SearchFieldSkeleton";
import { StockResultsSkeleton } from "@/components/skeletons/StockResultsSkeleton";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { BackLink } from "@/components/ui/BackLink";
import { Skeleton } from "@/components/ui/Skeleton";
import { getDictionary } from "@/lib/i18n";

export default function Loading() {
  const dict = getDictionary();

  return (
    <PageContainer width="wide">
      <SiteHeader />

      <header>
        <BackLink href="/" label={dict.nav.home} />
        <Skeleton className="mt-2 h-6 w-3/5" />
        <Skeleton className="mt-2 h-4 w-2/5" />
      </header>

      <Disclaimer />

      <SearchFieldSkeleton />

      <StockResultsSkeleton />

      <p role="status" className="sr-only">
        {dict.stock.loading}
      </p>

      <SiteFooter />
    </PageContainer>
  );
}
