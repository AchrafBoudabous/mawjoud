import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import type { Medication } from "@/lib/api";
import { getDictionary } from "@/lib/i18n";
import { CATEGORY_ORDER } from "@/lib/medications";
import { CARD_INTERACTIVE, EYEBROW } from "@/lib/ui";

type TrackedMedicationsProps = {
  medications: Medication[];
};

export function TrackedMedications({ medications }: TrackedMedicationsProps) {
  const dict = getDictionary();

  return (
    <section id="medicaments-suivis" aria-labelledby="tracked-title" className="scroll-mt-24">
      <p className={EYEBROW}>{dict.medications.trackedCount(medications.length)}</p>
      <h2 id="tracked-title" className="mt-1 text-2xl font-extrabold text-ink">
        {dict.medications.trackedTitle}
      </h2>
      <p className="mt-1 max-w-[60ch] text-muted">{dict.medications.trackedNote}</p>

      <div className="mt-8 grid gap-10 lg:grid-cols-2">
        {CATEGORY_ORDER.map((category) => {
          const items = medications.filter((m) => m.category === category);
          if (items.length === 0) return null;

          return (
            <div key={category}>
              <h3 className="flex items-center gap-2.5 text-base font-bold text-ink">
                <span className="flex size-8 items-center justify-center rounded-control bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-100">
                  <Icon name={category} className="size-4" />
                </span>
                {dict.medications.categories[category]}
                <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-semibold text-muted tabular-nums">
                  {items.length}
                </span>
              </h3>
              <ul className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {items.map((m) => (
                  <li key={m.id}>
                    <Link
                      href={`/medicaments/${m.slug}`}
                      className={`group flex items-center gap-3 p-3.5 ${CARD_INTERACTIVE}`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold text-ink">{m.name}</span>
                        <span className="block truncate text-sm text-muted">{m.generic_name}</span>
                      </span>
                      <Icon
                        name="arrow-right"
                        className="size-4 shrink-0 text-muted transition-[transform,color] duration-200 ease-standard group-hover:translate-x-0.5 group-hover:text-brand-600"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
