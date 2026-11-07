import Link from "next/link";
import { Disclaimer } from "@/components/Disclaimer";
import { GovernoratePicker } from "@/components/GovernoratePicker";
import { MedicationSearch } from "@/components/MedicationSearch";
import { TrackedMedications } from "@/components/TrackedMedications";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon, type IconName } from "@/components/ui/Icon";
import { getGovernorates, getMedications, type Medication } from "@/lib/api";
import { getDictionary } from "@/lib/i18n";
import { CATEGORY_ORDER } from "@/lib/medications";
import { BUTTON_BASE, BUTTON_PRIMARY, BUTTON_SECONDARY, EYEBROW } from "@/lib/ui";

export const revalidate = 300;

const HOW_ICONS: IconName[] = ["search", "phone", "report"];

/** One shortcut per category, so the chips span the whole tracked list. */
function quickPicks(medications: Medication[]): Medication[] {
  return CATEGORY_ORDER.flatMap((category) => {
    const first = medications.find((m) => m.category === category);
    return first ? [first] : [];
  });
}

export default async function Home() {
  const dict = getDictionary();

  const [medsResult, govsResult] = await Promise.allSettled([getMedications(), getGovernorates()]);

  if (medsResult.status === "rejected") {
    console.error("Failed to load tracked medications:", medsResult.reason);
  }

  const medications = medsResult.status === "fulfilled" ? medsResult.value.medications : null;
  const governorates = govsResult.status === "fulfilled" ? govsResult.value.governorates : null;
  const pharmacyCount = governorates ? governorates.reduce((sum, g) => sum + g.pharmacy_count, 0) : null;

  return (
    <>
      {/* ---------------- Hero ---------------- */}
      <section className="hero-backdrop relative border-b border-line/60">
        <div className="mx-auto flex w-full max-w-page flex-col gap-6 px-4 pt-10 pb-12 md:pt-20 md:pb-16">
          <p className="inline-flex items-center gap-2 self-start rounded-full border border-brand-200 bg-surface/80 px-3 py-1.5 text-xs font-semibold text-brand-700 shadow-card backdrop-blur animate-fade-in">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full rounded-full bg-stock-in animate-ping-soft" />
              <span className="relative inline-flex size-2 rounded-full bg-stock-in" />
            </span>
            {dict.home.eyebrow}
          </p>

          <div className="animate-fade-in-up">
            <h1 className="text-3xl font-extrabold text-ink md:text-4xl">
              {dict.home.titleLead}{" "}
              <span className="text-gradient-brand">{dict.home.titleAccent}</span>{" "}
              <span className="text-ink-soft">{dict.home.titleTail}</span>
            </h1>
            <p className="mt-3 max-w-[52ch] text-base text-muted md:text-lg">
              {dict.common.tagline}
            </p>
          </div>

          <MedicationSearch autoFocus />

          {medications && medications.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-xs font-semibold text-muted">{dict.home.quickLabel}</span>
              {quickPicks(medications).map((m) => (
                <Link
                  key={m.id}
                  href={`/medicaments/${m.slug}`}
                  className="pressable inline-flex min-h-9 items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-sm font-medium text-ink-soft shadow-card hover:border-brand-300 hover:text-brand-700"
                >
                  <Icon name={m.category} className="size-3.5 text-brand-600" />
                  {m.name}
                </Link>
              ))}
            </div>
          )}

          <Disclaimer />
        </div>
      </section>

      {/* ---------------- Stats strip ---------------- */}
      <section aria-label={dict.common.appName} className="border-b border-line/60 bg-surface">
        <dl className="mx-auto grid w-full max-w-wide grid-cols-2 gap-px px-4 py-6 md:grid-cols-4 md:px-6">
          {[
            medications ? { value: String(medications.length), label: dict.home.stats.medications(medications.length) } : null,
            pharmacyCount !== null ? { value: String(pharmacyCount), label: dict.home.stats.pharmacies(pharmacyCount) } : null,
            { value: "24", label: dict.home.stats.governorates },
            { value: "0 DT", label: dict.home.stats.free },
          ]
            .filter((s): s is { value: string; label: string } => s !== null)
            .map((s) => (
              <div key={s.label} className="flex flex-col items-center gap-0.5 py-2 text-center">
                <dt className="order-2 text-xs font-medium text-muted">{s.label}</dt>
                <dd className="order-1 text-2xl font-extrabold tabular-nums text-ink">{s.value}</dd>
              </div>
            ))}
        </dl>
      </section>

      <div className="mx-auto flex w-full max-w-wide flex-col gap-16 px-4 pt-12 md:px-6 md:pt-16">
        {/* ---------------- How it works ---------------- */}
        <section aria-labelledby="how-title">
          <p className={EYEBROW}>Mawjoud</p>
          <h2 id="how-title" className="mt-1 text-2xl font-extrabold text-ink">
            {dict.home.howTitle}
          </h2>
          <p className="mt-1 text-muted">{dict.home.howSubtitle}</p>
          <ol className="mt-6 grid gap-4 md:grid-cols-3">
            {dict.home.how.map((step, i) => (
              <li
                key={step.title}
                className="relative overflow-hidden rounded-card border border-line bg-surface p-5 shadow-card"
              >
                <span
                  aria-hidden="true"
                  className="absolute -right-2 -top-6 text-[5.5rem] font-black leading-none text-brand-50 select-none"
                >
                  {i + 1}
                </span>
                <span className="relative flex size-11 items-center justify-center rounded-control bg-brand-600 text-white shadow-[0_8px_18px_-8px_var(--brand-600)] dark:text-brand-50">
                  <Icon name={HOW_ICONS[i] ?? "check"} className="size-5" />
                </span>
                <h3 className="relative mt-4 text-lg font-bold text-ink">{step.title}</h3>
                <p className="relative mt-1 text-sm text-muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ---------------- Near me / garde / observatory ---------------- */}
        <section aria-labelledby="tools-title" className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <h2 id="tools-title" className="sr-only">{dict.home.toolsTitle}</h2>
          <div className="rounded-panel border border-line bg-surface p-6 shadow-card">
            <span className="flex size-11 items-center justify-center rounded-control bg-ink text-canvas">
              <Icon name="moon" className="size-5" />
            </span>
            <h3 className="mt-4 text-xl font-extrabold text-ink">{dict.home.dutyTitle}</h3>
            <p className="mt-1 text-sm text-muted">{dict.home.dutyBody}</p>
            {governorates && (
              <GovernoratePicker className="mt-4" governorates={governorates} basePath="/pharmacies/" />
            )}
          </div>
          <Link
            href="/observatoire"
            className="group relative flex flex-col overflow-hidden rounded-panel border border-line bg-surface p-6 shadow-card transition-[border-color,box-shadow] duration-200 hover:border-brand-300 hover:shadow-raised"
          >
            <span className="flex size-11 items-center justify-center rounded-control bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-100">
              <Icon name="trending" className="size-5" />
            </span>
            <h3 className="mt-4 text-xl font-extrabold text-ink">{dict.observatory.title}</h3>
            <p className="mt-1 text-sm text-muted">{dict.observatory.subtitle}</p>
            <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-sm font-semibold text-brand-700">
              {dict.home.observatoryCta}
              <Icon name="arrow-right" className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </span>
          </Link>
        </section>

        {/* ---------------- Tracked medications ---------------- */}
        {medications ? (
          <TrackedMedications medications={medications} />
        ) : (
          <EmptyState
            tone="warn"
            role="alert"
            icon="alert"
            title={dict.medications.loadErrorTitle}
            body={dict.medications.loadError}
          />
        )}

        {/* ---------------- Pharmacist CTA ---------------- */}
        <section className="relative overflow-hidden rounded-panel border border-brand-200 bg-brand-50 p-6 md:p-10">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-brand-200/50 blur-3xl"
          />
          <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="max-w-xl">
              <span className="flex size-11 items-center justify-center rounded-control bg-surface text-brand-600 shadow-card">
                <Icon name="pharmacy" className="size-5" />
              </span>
              <h2 className="mt-4 text-xl font-extrabold text-ink md:text-2xl">
                {dict.home.pharmacistTitle}
              </h2>
              <p className="mt-2 text-ink-soft">{dict.home.pharmacistBody}</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row md:flex-col lg:flex-row">
              <Link href="/pharmacien/inscription" className={`${BUTTON_BASE} ${BUTTON_PRIMARY}`}>
                {dict.home.pharmacistCta}
                <Icon name="arrow-right" />
              </Link>
              <Link href="/pharmacien/connexion" className={`${BUTTON_BASE} ${BUTTON_SECONDARY}`}>
                {dict.home.pharmacistLogin}
              </Link>
            </div>
          </div>
        </section>

        <Link
          href="/pharmacies"
          className={`${BUTTON_BASE} ${BUTTON_SECONDARY} self-center`}
        >
          <Icon name="map-pin" />
          {dict.home.ctaPharmacies}
        </Link>
      </div>
    </>
  );
}
