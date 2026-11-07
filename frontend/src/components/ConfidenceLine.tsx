"use client";

import { useEffect, useState } from "react";
import type { PharmacyStock } from "@/lib/api";
import { computeConfidence, type ConfidenceLevel } from "@/lib/confidence";
import { getDictionary } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const LEVEL_STYLE: Record<ConfidenceLevel, { bars: number; text: string }> = {
  high: { bars: 3, text: "text-ink" },
  medium: { bars: 2, text: "text-ink-soft" },
  low: { bars: 1, text: "text-muted" },
};

/** "Confirmé par 3 personnes ces dernières 24 h" + a 3-step signal meter.
 *  The meter is decorative; the sentence and the sr-only level carry
 *  the meaning. */
export function ConfidenceLine({ pharmacy }: { pharmacy: PharmacyStock }) {
  const dict = getDictionary();
  // `now` only after mount: the server render must not depend on the
  // request time, or hydration would mismatch.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => setNow(Date.now()), []);
  if (now === null) return null;

  const c = computeConfidence(pharmacy, now);
  if (!c) return null;

  const sentence = c.byPharmacy
    ? dict.confidence.byPharmacy
    : c.disagree > 0
      ? dict.confidence.contested(c.agree, c.disagree)
      : c.agree >= 2
        ? dict.confidence.people(c.agree)
        : c.agree === 1
          ? dict.confidence.single
          : dict.confidence.old;

  const style = LEVEL_STYLE[c.level];

  return (
    <p className={cn("flex items-center gap-2 text-sm", style.text)}>
      <span aria-hidden="true" className="flex h-3.5 items-end gap-0.5">
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn(
              "w-1 rounded-full",
              i === 1 ? "h-1.5" : i === 2 ? "h-2.5" : "h-3.5",
              i <= style.bars ? "bg-current" : "bg-line-strong"
            )}
          />
        ))}
      </span>
      <span>
        {sentence}
        <span className="sr-only"> — {dict.confidence.levels[c.level]}</span>
      </span>
    </p>
  );
}
