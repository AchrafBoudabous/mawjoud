import type { Metadata } from "next";
import { ApiStatus } from "@/components/ApiStatus";
import { Disclaimer } from "@/components/Disclaimer";
import { PageContainer } from "@/components/PageContainer";
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

      <header>
        <BackLink href="/" label={dict.nav.home} />
        <h1 className="mt-2 text-2xl font-extrabold text-ink md:text-3xl">{dict.apiStatus.title}</h1>
        <p className="mt-1 text-base text-muted">{dict.apiStatus.subtitle}</p>
      </header>

      <Disclaimer />

      <ApiStatus />

    </PageContainer>
  );
}
