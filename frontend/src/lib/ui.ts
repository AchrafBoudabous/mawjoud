/**
 * Shared control styles, in the shadcn/ui pattern: `cva` variant maps for
 * new code (`buttonVariants`, `badgeVariants`) plus the literal string
 * constants older components compose from. Every class is written out
 * literally — Tailwind v4 scans source text and never sees a class name
 * assembled at runtime.
 */
import { cva, type VariantProps } from "class-variance-authority";

export const buttonVariants = cva(
  "pressable inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-control font-semibold leading-tight select-none disabled:pointer-events-none disabled:opacity-55 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-brand-600 text-white shadow-[0_1px_0_0_rgb(255_255_255/0.15)_inset,0_6px_16px_-6px_var(--brand-600)] hover:bg-brand-700 dark:text-brand-50",
        secondary:
          "border border-line bg-surface text-ink shadow-card hover:border-brand-300 hover:bg-brand-50",
        soft: "bg-brand-50 text-brand-700 hover:bg-brand-100",
        ghost: "text-ink-soft hover:bg-surface-2 hover:text-ink",
        success:
          "border border-stock-in/35 bg-stock-in-bg text-stock-in hover:border-stock-in/70",
        danger:
          "border border-stock-out/35 bg-stock-out-bg text-stock-out hover:border-stock-out/70",
      },
      size: {
        sm: "min-h-9 px-3 text-sm",
        md: "min-h-11 px-4 text-sm",
        lg: "min-h-13 px-6 text-base",
        icon: "size-11",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export type ButtonVariants = VariantProps<typeof buttonVariants>;

export const badgeVariants = cva(
  "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full font-semibold",
  {
    variants: {
      tone: {
        brand: "bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200",
        neutral: "bg-surface-2 text-ink-soft ring-1 ring-inset ring-line",
      },
      size: {
        sm: "px-2 py-0.5 text-xs",
        md: "px-2.5 py-1 text-xs",
      },
    },
    defaultVariants: { tone: "neutral", size: "md" },
  }
);

// ---------------------------------------------------------------------
// Literal constants — kept so existing call sites
// (`${BUTTON_BASE} ${BUTTON_PRIMARY}`) inherit the redesign unchanged.
// ---------------------------------------------------------------------

export const BUTTON_BASE =
  "pressable inline-flex min-h-11 items-center justify-center gap-2 rounded-control px-4 text-sm font-semibold leading-tight select-none disabled:cursor-not-allowed disabled:opacity-55 [&_svg]:size-4 [&_svg]:shrink-0";

export const BUTTON_PRIMARY =
  "bg-brand-600 text-white shadow-[0_6px_16px_-6px_var(--brand-600)] hover:bg-brand-700 dark:text-brand-50";

export const BUTTON_SECONDARY =
  "border border-line bg-surface text-ink shadow-card hover:border-brand-300 hover:bg-brand-50";

/** Text-weight action: "Corriger", "Se déconnecter", footer links. */
export const BUTTON_QUIET =
  "inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-brand-700 underline decoration-brand-300 decoration-2 underline-offset-4 transition-colors duration-150 ease-standard hover:text-brand-800 hover:decoration-brand-600";

export const FIELD =
  "h-12 w-full rounded-field border border-line bg-surface px-3.5 text-base text-ink shadow-card transition-[border-color,box-shadow] duration-150 ease-standard placeholder:text-muted hover:border-line-strong focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15";

export const CARD = "rounded-card border border-line bg-surface shadow-card";

export const CARD_INTERACTIVE =
  "rounded-card border border-line bg-surface shadow-card transition-[border-color,box-shadow,transform] duration-200 ease-standard hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-raised";

/** Small uppercase label above a section heading. */
export const EYEBROW = "text-xs font-bold uppercase tracking-[0.14em] text-brand-600";
