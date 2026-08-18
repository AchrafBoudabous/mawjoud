import type { Metadata } from "next";
import { ApiStatus } from "@/components/ApiStatus";
import { Disclaimer } from "@/components/Disclaimer";
import { PageContainer } from "@/components/PageContainer";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { BackLink } from "@/components/ui/BackLink";
import { getDictionary } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "État des services — Mawjoud",
  description: "Diagnostic technique de la connexion entre le site et le serveur Mawjoud.",
  robots: { index: false },
};

export default function StatutPage() {
  const dict = getDictionary();

  return (
    <PageContainer>
      <SiteHeader />

      <header>
        <BackLink href="/" label={dict.nav.home} />
        <h1 className="mt-2 text-2xl font-semibold text-ink">{dict.apiStatus.title}</h1>
        <p className="mt-1 text-base text-muted">{dict.apiStatus.subtitle}</p>
      </header>

      <Disclaimer />

      <ApiStatus />

      <SiteFooter />
    </PageContainer>
  );
}
