import { fr } from "./fr";

export const defaultLocale = "fr" as const;
export const locales = ["fr"] as const;
export type Locale = (typeof locales)[number];
export type Dictionary = typeof fr;

export function getDictionary(locale: Locale = defaultLocale): Dictionary {
  void locale; // only "fr" exists today; kept as a param for the future `ar` locale
  return fr;
}
