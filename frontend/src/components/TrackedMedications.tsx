import Link from "next/link";
import type { Medication } from "@/lib/api";
import { getDictionary } from "@/lib/i18n";
import { CATEGORY_ORDER } from "@/lib/medications";
import { CARD_INTERACTIVE } from "@/lib/ui";

type TrackedMedicationsProps = {
  medications: Medication[];
};

export function TrackedMedications({ medications }: TrackedMedicationsProps) {
  const dict = getDictionary();

  return (
    <section id="medicaments-suivis" className="scroll-mt-6">
      <h2 className="text-lg font-semibold text-ink">{dict.medications.trackedTitle}</h2>
      <p className="mt-1 text-sm text-muted">
        {dict.medications.trackedCount(medications.length)}
      </p>
      <p className="mt-1 text-sm text-muted">{dict.medications.trackedNote}</p>

      <div className="mt-4 flex flex-col gap-6">
        {CATEGORY_ORDER.map((category) => {
          const items = medications.filter((m) => m.category === category);
          if (items.length === 0) return null;

          return (
            <div key={category}>
              <h3 className="font-semibold text-ink">
                {dict.medications.categories[category]}
              </h3>
              <ul className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {items.map((m) => (
                  <li key={m.id}>
                    <Link href={`/medicaments/${m.slug}`} className={`block ${CARD_INTERACTIVE} p-4`}>
                      <p className="font-medium text-ink">{m.name}</p>
                      <p className="text-sm text-muted">{m.generic_name}</p>
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
