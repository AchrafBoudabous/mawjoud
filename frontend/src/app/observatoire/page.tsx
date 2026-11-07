import type { Metadata } from "next";
import Link from "next/link";
import { Disclaimer } from "@/components/Disclaimer";
import { PageContainer } from "@/components/PageContainer";
import { Sparkline } from "@/components/Sparkline";
import { BackLink } from "@/components/ui/BackLink";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import type { ObservatoryMedication, ObservatoryResponse } from "@/lib/api";
import { getObservatory, observatoryCsvUrl } from "@/lib/api";
import { formatAbsoluteDateTime } from "@/lib/format";
import { getDictionary } from "@/lib/i18n";
import { CATEGORY_ORDER } from "@/lib/medications";
import { BUTTON_BASE, BUTTON_SECONDARY, CARD, EYEBROW } from "@/lib/ui";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "Observatoire des ruptures de médicaments en Tunisie — Mawjoud",
  description:
    "Tendances anonymes des signalements de disponibilité des médicaments chroniques en Tunisie : thyroïde, insulines, psychiatrie, douleurs cancéreuses. Données téléchargeables.",
};

const WEEKS = 12;

function shortageShare(m: ObservatoryMedication): (number | null)[] {
  return m.weeks.map((w) => {
    const total = w.in_stock_reports + w.out_of_stock_reports;
    return total > 0 ? w.out_of_stock_reports / total : null;
  });
}

function weekLabel(iso: string): string {
  const [, mm, dd] = iso.split("-");
  return `Sem. du ${dd}/${mm}`;
}

/** Thin segmented bar (8px, rounded ends, 2px surface gaps, no text). */
function StatusBar({ m }: { m: ObservatoryMedication }) {
  const parts = [
    { v: m.in_stock_pharmacies, c: "bg-stock-in" },
    { v: m.unsure_pharmacies, c: "bg-stock-unsure" },
    { v: m.out_of_stock_pharmacies, c: "bg-stock-out" },
  ].filter((p) => p.v > 0);
  const total = parts.reduce((s, p) => s + p.v, 0);
  if (total === 0) return <div aria-hidden="true" className="h-2 w-full rounded-full bg-surface-2" />;
  return (
    <div aria-hidden="true" className="flex h-2 w-full gap-[2px]">
      {parts.map((p, i) => (
        <span key={i} className={`h-full rounded-full ${p.c}`} style={{ width: `${(p.v / total) * 100}%` }} />
      ))}
    </div>
  );
}

export default async function ObservatoryPage() {
  const dict = getDictionary();
  const t = dict.observatory;

  let data: ObservatoryResponse | null = null;
  try {
    data = await getObservatory(WEEKS);
  } catch (error) {
    console.error("Failed to load observatory:", error);
  }
  const csv = observatoryCsvUrl(WEEKS);

  const rows = data?.medications ?? [];
  const byCategory = CATEGORY_ORDER.map((c) => ({ c, items: rows.filter((m) => m.medication.category === c) })).filter(
    (g) => g.items.length > 0
  );

  // "Most under strain": highest current out-of-stock share among
  // medications with enough reports to mean something.
  const tense = rows
    .map((m) => {
      const reported = m.in_stock_pharmacies + m.out_of_stock_pharmacies;
      return { m, reported, rate: reported > 0 ? m.out_of_stock_pharmacies / reported : 0 };
    })
    .filter((x) => x.reported >= 3)
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 3);

  return (
    <PageContainer width="wide">
      <header>
        <BackLink href="/" label={dict.nav.home} />
        <p className={`mt-3 ${EYEBROW}`}>{t.eyebrow}</p>
        <h1 className="mt-1 text-2xl font-extrabold text-ink md:text-3xl">{t.title}</h1>
        <p className="mt-2 max-w-[70ch] text-base text-muted">{t.subtitle}</p>
      </header>

      <Disclaimer />

      {!data ? (
        <EmptyState tone="warn" role="alert" icon="alert" title={t.title} body={t.error} />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-[80ch] text-sm text-muted">{t.method(data.max_age_days, data.weeks)}</p>
            {csv && (
              <a href={csv} className={`${BUTTON_BASE} ${BUTTON_SECONDARY}`} download>
                <Icon name="download" />
                {t.download}
              </a>
            )}
          </div>

          {tense.length > 0 && (
            <section aria-labelledby="tense-title">
              <h2 id="tense-title" className="text-sm font-bold text-ink">{t.mostShort}</h2>
              <ul className="mt-3 grid gap-3 sm:grid-cols-3">
                {tense.map(({ m, rate }) => (
                  <li key={m.medication.id} className={`${CARD} p-4`}>
                    <p className="text-sm text-muted">{m.medication.name}</p>
                    <p className="mt-1 text-3xl font-extrabold text-ink">{Math.round(rate * 100)} %</p>
                    <p className="text-xs text-muted">{t.pharmaciesNow(m.in_stock_pharmacies, m.out_of_stock_pharmacies)}</p>
                    <Sparkline
                      className="mt-3"
                      values={shortageShare(m)}
                      labels={m.weeks.map((w) => weekLabel(w.week_start))}
                      max={1}
                      valueLabels={shortageShare(m).map((v) => (v === null ? t.noData : t.shortageRate(Math.round(v * 100))))}
                      ariaLabel={t.trendLabel(m.medication.name)}
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted" aria-label="Légende">
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-4 rounded-full bg-stock-in" />{dict.stock.status.in_stock}</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-4 rounded-full bg-stock-unsure" />{dict.stock.status.unsure}</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-4 rounded-full bg-stock-out" />{dict.stock.status.out_of_stock}</span>
          </div>

          {byCategory.map(({ c, items }) => (
            <section key={c} aria-labelledby={`obs-${c}`} className={`${CARD} overflow-hidden`}>
              <h2 id={`obs-${c}`} className="flex items-center gap-2 border-b border-line bg-surface-2 px-4 py-3 text-sm font-bold text-ink">
                <Icon name={c} className="size-4 text-brand-600" />
                {dict.medications.categories[c]}
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[44rem] text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted">
                      <th scope="col" className="px-4 py-2 font-semibold">{t.colMedication}</th>
                      <th scope="col" className="px-4 py-2 font-semibold">{t.colNow}</th>
                      <th scope="col" className="px-4 py-2 font-semibold">{t.colTrend}</th>
                      <th scope="col" className="px-4 py-2 font-semibold">{t.colDemand}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((m) => (
                      <tr key={m.medication.id} className="border-t border-line align-middle">
                        <th scope="row" className="px-4 py-3 text-left font-normal">
                          <Link href={`/medicaments/${m.medication.slug}`} className="font-semibold text-ink hover:text-brand-700">
                            {m.medication.name}
                          </Link>
                          <span className="block text-xs text-muted">{m.medication.generic_name}</span>
                        </th>
                        <td className="w-56 px-4 py-3">
                          <StatusBar m={m} />
                          <span className="mt-1.5 block text-xs text-muted tabular-nums">
                            {m.in_stock_pharmacies + m.out_of_stock_pharmacies + m.unsure_pharmacies > 0
                              ? t.pharmaciesNow(m.in_stock_pharmacies, m.out_of_stock_pharmacies)
                              : t.noData}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Sparkline
                            values={shortageShare(m)}
                            labels={m.weeks.map((w) => weekLabel(w.week_start))}
                            max={1}
                            valueLabels={shortageShare(m).map((v) => (v === null ? t.noData : t.shortageRate(Math.round(v * 100))))}
                            ariaLabel={t.trendLabel(m.medication.name)}
                          />
                          {shortageShare(m).every((v) => v === null) && <span className="text-xs text-muted">{t.noData}</span>}
                        </td>
                        <td className="px-4 py-3">
                          <Sparkline
                            values={m.weeks.map((w) => w.viewers)}
                            labels={m.weeks.map((w) => weekLabel(w.week_start))}
                            valueLabels={m.weeks.map((w) => `${w.viewers} recherche${w.viewers > 1 ? "s" : ""}`)}
                            ariaLabel={t.demandLabel(m.medication.name)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}

          <p className="text-xs text-muted">{t.updated(formatAbsoluteDateTime(data.generated_at))}</p>
        </>
      )}
    </PageContainer>
  );
}
