"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { getDictionary } from "@/lib/i18n";
import { BUTTON_BASE, BUTTON_SECONDARY } from "@/lib/ui";
import { cn } from "@/lib/utils";

type ShareButtonProps = {
  medicationName: string;
  governorateName: string;
  inStockCount: number;
  className?: string;
};

/** Native share sheet when the phone has one (WhatsApp, Messenger,
 *  Facebook groups…); otherwise copy-link + WhatsApp + Facebook links.
 *  The page's Open Graph image is the "status card" those apps preview. */
export function ShareButton({ medicationName, governorateName, inStockCount, className }: ShareButtonProps) {
  const dict = getDictionary();
  const t = dict.share;
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState("");

  const title = t.title(medicationName, governorateName);
  const text = t.text(medicationName, governorateName, inStockCount);

  async function handleClick() {
    // Strip ?pres=1 etc.: the shared link should never carry a hint of
    // how the sharer found the page.
    const shareUrl = `${window.location.origin}${window.location.pathname}`;
    setUrl(shareUrl);
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url: shareUrl });
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }
    setOpen(true);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  const external = "pressable flex min-h-12 items-center gap-3 rounded-card border border-line px-4 text-sm font-semibold hover:border-brand-300 hover:bg-brand-50";

  return (
    <>
      <button type="button" onClick={handleClick} className={cn(BUTTON_BASE, BUTTON_SECONDARY, className)}>
        <Icon name="share" />
        {t.button}
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title={t.dialogTitle} closeLabel={t.close}>
        <p className="rounded-card bg-surface-2 p-3 text-sm text-ink-soft">{text}</p>
        <div className="mt-4 grid gap-2">
          <button type="button" onClick={copyLink} className={external}>
            <Icon name={copied ? "check" : "copy"} className="size-5 text-brand-600" />
            {copied ? t.copied : t.copy}
          </button>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className={external}
          >
            <Icon name="report" className="size-5 text-brand-600" />
            {t.whatsapp}
          </a>
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
            target="_blank"
            rel="noopener noreferrer"
            className={external}
          >
            <Icon name="share" className="size-5 text-brand-600" />
            {t.facebook}
          </a>
        </div>
      </Sheet>
    </>
  );
}
