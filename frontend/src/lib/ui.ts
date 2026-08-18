/**
 * Shared control class strings, written out as literal constants.
 * Tailwind v4 scans source text for class names — a class string built at
 * runtime (e.g. via template interpolation of a variable) is never
 * generated. `@/lib/stock`'s `STOCK_STYLES` already uses this technique;
 * this file extends it to buttons, fields and cards so every component
 * composes from one place instead of re-typing the same utilities.
 * See docs/ARCHITECTURE.md 8.7.
 */

export const BUTTON_BASE =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-control px-4 text-sm font-medium leading-tight transition-colors duration-150 ease-standard disabled:cursor-not-allowed disabled:opacity-60";

export const BUTTON_PRIMARY =
  "bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800";

export const BUTTON_SECONDARY =
  "border border-line bg-surface text-brand-700 hover:border-brand-200 hover:bg-brand-50 active:bg-brand-100";

/** Text-weight action: "Corriger", "Se déconnecter", footer links. */
export const BUTTON_QUIET =
  "inline-flex min-h-11 items-center text-sm font-medium text-brand-700 underline decoration-1 underline-offset-4 transition-colors duration-150 ease-standard hover:text-brand-800";

export const FIELD =
  "h-12 w-full rounded-field border border-line bg-surface px-3 text-base text-ink transition-colors duration-150 ease-standard placeholder:text-muted hover:border-line-strong";

export const CARD = "rounded-card border border-line bg-surface shadow-card";

export const CARD_INTERACTIVE =
  "rounded-card border border-line bg-surface shadow-card transition-colors duration-150 ease-standard hover:border-brand-200 active:bg-brand-50/50";
