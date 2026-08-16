import { getDictionary } from "@/lib/i18n";

export default function Loading() {
  const dict = getDictionary();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-screen-sm flex-col gap-6 px-4 py-8 md:max-w-6xl">
      <p className="py-12 text-center text-muted">{dict.pharmacies.loading}</p>
    </div>
  );
}
