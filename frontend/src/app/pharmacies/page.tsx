import type { Metadata } from "next";
import Link from "next/link";
import { Disclaimer } from "@/components/Disclaimer";
import { GovernoratePicker } from "@/components/GovernoratePicker";
import { PageContainer } from "@/components/PageContainer";
import { BackLink } from "@/components/ui/BackLink";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import type { Governorate } from "@/lib/api";
import { getGovernorates } from "@/lib/api";
import { getDictionary } from "@/lib/i18n";
import { BUTTON_BASE, BUTTON_SECONDARY, CARD_INTERACTIVE } from "@/lib/ui";
import { cn } from "@/lib/utils";

// Short page window: if the API was asleep when this was (pre)rendered,
// the "indisponible" state must not stick for an hour. Successful API
// responses stay in the data cache for longer (see lib/api.ts).
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Pharmacies de Tunisie par gouvernorat — Mawjoud",
  description:
    "Annuaire communautaire des pharmacies des 24 gouvernorats de Tunisie, avec les pharmacies de garde et de nuit.",
};

export default async function PharmaciesIndexPage() {
  const dict = getDictionary();

  let governorates: Governorate[] | null = null;
  try {
    governorates = (await getGovernorates()).governorates;
  } catch (error) {
    console.error("Failed to load governorates:", error);
  }

  return (
    <PageContainer width="wide">
      <header>
        <BackLink href="/" label={dict.nav.home} />
        <h1 className="mt-2 text-2xl font-extrabold text-ink md:text-3xl">{dict.pharmacies.title}</h1>
        <p className="mt-1 max-w-[65ch] text-base text-muted">{dict.pharmacies.subtitle}</p>
      </header>

      <Disclaimer />

      {governorates ? (
        <>
          <section className="rounded-panel border border-brand-200 bg-brand-50 p-5 md:p-6">
            <h2 className="text-lg font-extrabold text-ink">{dict.governorate.pickTitle}</h2>
            <GovernoratePicker className="mt-4 max-w-xl" governorates={governorates} basePath="/pharmacies/" />
          </section>

          <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {governorates.map((g) => (
              <li key={g.slug}>
                <Link href={`/pharmacies/${g.slug}`} className={cn("group flex items-center gap-3 p-3.5", CARD_INTERACTIVE)}>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                      <span className="truncate font-bold text-ink">{g.name_fr}</span>
                      <span lang="ar" className="truncate text-sm text-muted">{g.name_ar}</span>
                    </span>
                    <span className="block text-sm text-muted tabular-nums">
                      {g.pharmacy_count > 0 ? dict.governorate.pharmacyCount(g.pharmacy_count) : dict.governorate.noPharmacies}
                    </span>
                  </span>
                  <Icon name="arrow-right" className="size-4 shrink-0 text-muted transition-transform duration-200 group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted">{dict.pharmacies.osmNote}</p>
        </>
      ) : (
        <EmptyState
          tone="warn"
          role="alert"
          icon="alert"
          title={dict.pharmacies.errorTitle}
          body={dict.pharmacies.error}
          action={
            // A full reload on purpose: a client navigation needs an RSC fetch,
            // which is exactly what just failed.
            // eslint-disable-next-line @next/next/no-html-link-for-pages
            <a href="/pharmacies" className={`${BUTTON_BASE} ${BUTTON_SECONDARY}`}>
              {dict.pharmacies.retry}
            </a>
          }
        />
      )}
    </PageContainer>
  );
}
