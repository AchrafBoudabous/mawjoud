import { Icon } from "@/components/ui/Icon";
import { formatPhone } from "@/lib/format";
import { getDictionary } from "@/lib/i18n";

type PhoneLinkProps = {
  phone: string | null;
};

/** The phone number is the action the disclaimer asks for ("Appelez la
 *  pharmacie avant de vous déplacer"). One component for all three places
 *  it used to be rendered differently: PharmacyListItem, StockPharmacyListItem
 *  and the map popups. No `"use client"` needed — like PharmacyListItem
 *  since step 2, it is pulled into the client bundle by its importer. */
export function PhoneLink({ phone }: PhoneLinkProps) {
  const dict = getDictionary();

  if (!phone) {
    return <p className="text-sm text-muted">{dict.pharmacies.noPhone}</p>;
  }

  return (
    <a
      href={`tel:${phone}`}
      aria-label={dict.pharmacies.callAria(formatPhone(phone))}
      onClick={(e) => e.stopPropagation()}
      className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-700 underline decoration-1 underline-offset-4 transition-colors duration-150 ease-standard hover:text-brand-800"
    >
      <Icon name="phone" className="size-4 shrink-0" />
      <span className="tabular-nums">{formatPhone(phone)}</span>
    </a>
  );
}
