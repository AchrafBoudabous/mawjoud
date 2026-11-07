import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Disclaimer } from "@/components/Disclaimer";
import { GovernoratePicker } from "@/components/GovernoratePicker";
import { MedicationSearch } from "@/components/MedicationSearch";
import { PageContainer } from "@/components/PageContainer";
import { BackLink } from "@/components/ui/BackLink";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import type { GovernorateAvailability, MedicationAvailabilityResponse } from "@/lib/api";
import { ApiError, getGovernorates, getMedicationAvailability } from "@/lib/api";
import { getDictionary } from "@/lib/i18n";
import { BUTTON_BASE, BUTTON_SECONDARY, CARD_INTERACTIVE, EYEBROW } from "@/lib/ui";
import { cn } from "@/lib/utils";

export const revalidate = 120;

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const data = await getMedicationAvailability(slug);
    return {
      title: `${data.medication.name} — disponibilité en Tunisie | Mawjoud`,
      description: `Où trouver ${data.medication.name} (${data.medication.generic_name}) en Tunisie, gouvernorat par gouvernorat. Informations communautaires, non garanties — appelez avant de vous déplacer.`,
    };
  } catch {
    return { title: "Disponibilité d'un médicament en Tunisie | Mawjoud" };
  }
}

/** Governorates where it was seen recently come first. */
function rank(g: GovernorateAvailability): number {
  return g.in_stock * 1000 + (g.in_stock + g.out_of_stock + g.unsure) * 10 + g.pharmacy_count / 1000;
}

export default async function MedicationOverviewPage({ params }: PageProps) {
  const { slug } = await params;
  const dict = getDictionary();

  let data: MedicationAvailabilityResponse | null = null;
  try {
    data = await getMedicationAvailability(slug);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    console.error("Failed to load national availability:", error);
  }

  let governorates = data?.governorates ?? null;
  if (!governorates) {
    // The picker must still work when the availability query fails.
    try {
      governorates = (await getGovernorates()).governorates.map((g) => ({
        slug: g.slug, name_fr: g.name_fr, name_ar: g.name_ar, pharmacy_count: g.pharmacy_count,
        in_stock: 0, out_of_stock: 0, unsure: 0, last_report_at: null,
      }));
    } catch {
      governorates = null;
    }
  }

  const geo = await getGovernorates().then((r) => r.governorates).catch(() => []);
  const govsWithStock = governorates?.filter((g) => g.in_stock > 0).length ?? 0;
  const sorted = governorates ? [...governorates].sort((a, b) => rank(b) - rank(a)) : [];

  return (
    <PageContainer width="wide">
      <div className="grid gap-5 md:grid-cols-[1fr_minmax(0,24rem)] md:items-end">
        <header>
          <BackLink href="/" label={dict.nav.home} />
          {data && (
            <div className="mt-3 flex items-start gap-4 animate-fade-in-up">
              <span className="flex size-14 shrink-0 items-center justify-center rounded-card bg-brand-600 text-white shadow-[0_10px_24px_-10px_var(--brand-600)] dark:text-brand-50">
                <Icon name={data.medication.category} className="size-7" />
              </span>
              <div className="min-w-0">
                <p className={EYEBROW}>{dict.medications.categories[data.medication.category]}</p>
                <h1 className="mt-0.5 text-2xl font-extrabold text-ink md:text-3xl">{data.medication.name}</h1>
                <p className="mt-1 text-base text-muted">
                  {data.medication.generic_name}
                  {data.medication.form ? ` · ${data.medication.form}` : ""}
                </p>
              </div>
            </div>
          )}
        </header>
        <MedicationSearch compact />
      </div>

      <Disclaimer />

      <section aria-labelledby="pick-title" className="rounded-panel border border-brand-200 bg-brand-50 p-5 md:p-6">
        <h2 id="pick-title" className="text-lg font-extrabold text-ink">{dict.governorate.pickTitle}</h2>
        <p className="mt-1 text-sm text-ink-soft">{dict.governorate.pickSubtitle}</p>
        {geo.length > 0 && (
          <GovernoratePicker className="mt-4 max-w-xl" governorates={geo} basePath={`/medicaments/${slug}/`} />
        )}
      </section>

      {governorates ? (
        <section aria-labelledby="national-title">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 id="national-title" className="text-xl font-extrabold text-ink">{dict.national.title}</h2>
              {data && <p className="mt-1 max-w-[70ch] text-sm text-muted">{dict.national.subtitle(data.max_age_days)}</p>}
            </div>
            {data && (
              <p className="text-sm font-semibold text-ink-soft">
                {data.totals.in_stock > 0 ? dict.national.totals(data.totals.in_stock, govsWithStock) : dict.national.nobody}
              </p>
            )}
          </div>

          <ul className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map((g) => {
              const reported = g.in_stock + g.out_of_stock + g.unsure;
              return (
                <li key={g.slug}>
                  <Link
                    href={`/medicaments/${slug}/${g.slug}`}
                    className={cn("group flex items-center gap-3 p-3.5", CARD_INTERACTIVE)}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "h-10 w-1.5 shrink-0 rounded-full",
                        g.in_stock > 0 ? "bg-stock-in" : reported > 0 ? "bg-stock-out" : "bg-line-strong"
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline gap-2">
                        <span className="truncate font-bold text-ink">{g.name_fr}</span>
                        <span lang="ar" className="truncate text-sm text-muted">{g.name_ar}</span>
                      </span>
                      <span className="block text-sm text-muted">
                        {reported === 0
                          ? `${dict.national.noReports} · ${dict.governorate.pharmacyCount(g.pharmacy_count)}`
                          : [
                              g.in_stock > 0 ? dict.national.inStock(g.in_stock) : null,
                              g.out_of_stock > 0 ? dict.national.outOfStock(g.out_of_stock) : null,
                            ].filter(Boolean).join(" · ") || dict.national.noReports}
                      </span>
                    </span>
                    <Icon
                      name="arrow-right"
                      className="size-4 shrink-0 text-muted transition-[transform,color] duration-200 group-hover:translate-x-0.5 group-hover:text-brand-600"
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : (
        <EmptyState
          tone="warn"
          role="alert"
          icon="alert"
          title={dict.stock.errorTitle}
          body={dict.stock.error}
          action={
            <a href={`/medicaments/${encodeURIComponent(slug)}`} className={`${BUTTON_BASE} ${BUTTON_SECONDARY}`}>
              {dict.stock.retry}
            </a>
          }
        />
      )}
    </PageContainer>
  );
}
