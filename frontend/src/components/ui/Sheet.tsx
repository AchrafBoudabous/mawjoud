"use client";

import { useEffect, useRef } from "react";
import { Icon } from "@/components/ui/Icon";

type SheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  closeLabel: string;
  children: React.ReactNode;
};

/** Native <dialog> as a bottom sheet on phones, a centred card from sm:.
 *  showModal() gives a real focus trap, Escape-to-close and an inert
 *  background with no extra library. */
export function Sheet({ open, onClose, title, closeLabel, children }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
  }, [open]);

  // Mounted only while open: a results page has one sheet per pharmacy
  // card (150+ in Sfax), and keeping them all in the DOM was pure weight.
  if (!open) return null;

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        // A click on the backdrop (the dialog element itself) closes it.
        if (e.target === e.currentTarget) onClose();
      }}
      aria-label={title}
      className="m-0 mt-auto w-full max-w-none rounded-t-panel border border-line bg-surface p-0 text-ink shadow-float backdrop:bg-ink/40 backdrop:backdrop-blur-sm open:animate-fade-in-up sm:m-auto sm:max-w-lg sm:rounded-panel"
    >
      <div className="flex max-h-[85dvh] flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <h2 className="text-base font-bold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="pressable flex size-10 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-ink"
          >
            <Icon name="x" className="size-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </dialog>
  );
}
