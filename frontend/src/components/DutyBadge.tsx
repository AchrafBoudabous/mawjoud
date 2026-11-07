import { Icon } from "@/components/ui/Icon";
import { formatTunisTime } from "@/lib/format";
import { getDictionary } from "@/lib/i18n";

/** "De garde jusqu'à 08:00" (a declared garde in progress) or "Ouverte
 *  la nuit" (24/7 / pharmacie de nuit). Renders nothing otherwise. */
export function DutyBadge({ onDutyUntil, is24h }: { onDutyUntil: string | null; is24h: boolean }) {
  const dict = getDictionary();
  if (!onDutyUntil && !is24h) return null;

  return (
    <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-ink px-2 py-0.5 text-xs font-semibold text-canvas">
      <Icon name="moon" className="size-3.5" strokeWidth={2.2} />
      {onDutyUntil ? dict.duty.onDutyUntil(formatTunisTime(onDutyUntil)) : dict.duty.openAtNight}
    </span>
  );
}
