import { Icon } from "@/components/ui/Icon";
import { formatPhone } from "@/lib/format";
import { getDictionary } from "@/lib/i18n";
import { BUTTON_BASE } from "@/lib/ui";
import { cn } from "@/lib/utils";

type PhoneLinkProps = {
  phone: string | null;
  /** "link" (default) for popups; "button" for the card action row. */
  variant?: "link" | "button";
};

/** The phone number is the action the disclaimer asks for ("Appelez la
 *  pharmacie avant de vous déplacer"), so on cards it is the primary
 *  button. */
export function PhoneLink({ phone, variant = "link" }: PhoneLinkProps) {
  const dict = getDictionary();

  if (!phone) {
    return <p className="text-sm text-muted">{dict.pharmacies.noPhone}</p>;
  }

  const formatted = formatPhone(phone);

  if (variant === "button") {
    return (
      <a
        href={`tel:${phone}`}
        aria-label={dict.pharmacies.callAria(formatted)}
        className={cn(
          BUTTON_BASE,
          "min-h-10 bg-brand-600 px-3.5 text-white shadow-[0_6px_14px_-6px_var(--brand-600)] hover:bg-brand-700 dark:text-brand-50"
        )}
      >
        <Icon name="phone" />
        <span className="tabular-nums">{formatted}</span>
      </a>
    );
  }

  return (
    <a
      href={`tel:${phone}`}
      aria-label={dict.pharmacies.callAria(formatted)}
      className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-700 underline decoration-brand-300 decoration-2 underline-offset-4 transition-colors duration-150 ease-standard hover:text-brand-800"
    >
      <Icon name="phone" className="size-4 shrink-0" />
      <span className="tabular-nums">{formatted}</span>
    </a>
  );
}
