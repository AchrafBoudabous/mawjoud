import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

type BackLinkProps = {
  href: string;
  label: string;
};

/** Replaces the literal "←" that used to open `nav.home` / `common.backHome`
 *  — Public Sans' `latin` subset does not include U+2190, and a directional
 *  glyph baked into translated copy would also need rewriting for the
 *  phase-2 Arabic RTL locale. See docs/ARCHITECTURE.md 8.3. */
export function BackLink({ href, label }: BackLinkProps) {
  return (
    <Link
      href={href}
      className="pressable -ml-2 inline-flex min-h-10 items-center gap-1 rounded-full px-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-50 hover:text-brand-800"
    >
      <Icon name="chevron-left" className="size-4 shrink-0" />
      {label}
    </Link>
  );
}
