"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { formatPhone } from "@/lib/format";
import { getDictionary } from "@/lib/i18n";
import { BUTTON_BASE, BUTTON_PRIMARY } from "@/lib/ui";
import { cn } from "@/lib/utils";

type CallScriptButtonProps = {
  medicationName: string;
  genericName: string;
  form: string | null;
  pharmacyName: string;
  phone: string | null;
};

/** "Quoi demander": the exact sentences to read on the phone, in French,
 *  Tunisian Arabic and Arabizi. Logistics only (stock, set one aside,
 *  opening hours) — never anything that could read as medical advice. */
export function CallScriptButton({ medicationName, genericName, form, pharmacyName, phone }: CallScriptButtonProps) {
  const dict = getDictionary();
  const t = dict.callScript;
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const blocks = [
    { key: "fr", label: t.french, dir: "ltr" as const, lang: "fr",
      lines: t.lines(medicationName, genericName, form).filter((l): l is string => Boolean(l)) },
    { key: "ar", label: t.derja, dir: "rtl" as const, lang: "aeb", lines: t.derjaLines(medicationName) },
    { key: "latn", label: t.arabizi, dir: "ltr" as const, lang: "aeb-Latn", lines: t.arabiziLines(medicationName) },
  ];

  async function copy(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 2000);
    } catch {
      /* clipboard blocked: the text is on screen anyway */
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(BUTTON_BASE, "min-h-10 px-3 text-ink-soft hover:bg-surface-2 hover:text-ink")}
      >
        <Icon name="report" />
        {t.button}
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title={t.title} closeLabel={t.close}>
        <p className="text-sm font-semibold text-ink">{pharmacyName}</p>
        <p className="mt-1 text-xs text-muted">{t.intro}</p>

        <div className="mt-4 flex flex-col gap-3">
          {blocks.map((b) => {
            const text = b.lines.join("\n");
            return (
              <section key={b.key} className="rounded-card border border-line bg-surface-2 p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-brand-700">{b.label}</h3>
                  <button
                    type="button"
                    onClick={() => copy(b.key, text)}
                    className="pressable inline-flex min-h-8 items-center gap-1 rounded-full px-2.5 text-xs font-semibold text-ink-soft hover:bg-surface"
                  >
                    <Icon name={copied === b.key ? "check" : "copy"} className="size-3.5" />
                    {copied === b.key ? t.copied : t.copy}
                  </button>
                </div>
                <div dir={b.dir} lang={b.lang} className="mt-2 flex flex-col gap-1.5 text-base leading-relaxed text-ink">
                  {b.lines.map((line) => (
                    <p key={line}>{b.dir === "rtl" ? line : `« ${line} »`}</p>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        {phone && (
          <a
            href={`tel:${phone}`}
            className={cn(BUTTON_BASE, BUTTON_PRIMARY, "mt-4 w-full min-h-12 text-base")}
          >
            <Icon name="phone-call" />
            {t.call} · <span className="tabular-nums">{formatPhone(phone)}</span>
          </a>
        )}
      </Sheet>
    </>
  );
}
