import Link from "next/link";
import { getDictionary } from "@/lib/i18n";

export default function NotFound() {
  const dict = getDictionary();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-screen-sm flex-col items-center justify-center gap-4 px-4 py-8 text-center">
      <h1 className="text-2xl font-bold text-ink">{dict.stock.notFoundTitle}</h1>
      <p className="text-muted">{dict.stock.notFoundBody}</p>
      <Link href="/" className="text-sm text-brand-600 underline">
        {dict.common.backHome}
      </Link>
    </div>
  );
}
