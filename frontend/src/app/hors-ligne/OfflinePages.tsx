"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { formatAbsoluteDateTime } from "@/lib/format";
import { getDictionary } from "@/lib/i18n";
import { CARD_INTERACTIVE } from "@/lib/ui";

type Entry = { path: string; title: string; savedAt: string };

/** Lists the pages this phone has cached (index kept by /sw.js). Plain
 *  <a> links on purpose: a client-side navigation would try to fetch an
 *  RSC payload, which does not exist offline. */
export function OfflinePages() {
  const dict = getDictionary();
  const [entries, setEntries] = useState<Entry[] | null>(null);

  useEffect(() => {
    fetch("/__mawjoud-offline-index")
      .then((r) => (r.ok ? r.json() : []))
      .then((list: Entry[]) =>
        setEntries(
          Array.isArray(list)
            ? list.filter((e) => typeof e.path === "string" && e.path.startsWith("/") && e.path !== "/hors-ligne")
            : []
        )
      )
      .catch(() => setEntries([]));
  }, []);

  if (entries === null) return null;
  if (entries.length === 0) return <p className="text-sm text-muted">{dict.offline.none}</p>;

  return (
    <ul className="flex flex-col gap-2">
      {entries.map((e) => (
        <li key={e.path}>
          <a href={e.path} className={`flex items-center gap-3 p-3.5 ${CARD_INTERACTIVE}`}>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold text-ink">{e.title.replace(/ \| Mawjoud$| — Mawjoud$/, "")}</span>
              <span className="block text-xs text-muted">{formatAbsoluteDateTime(e.savedAt)}</span>
            </span>
            <Icon name="arrow-right" className="size-4 shrink-0 text-muted" />
          </a>
        </li>
      ))}
    </ul>
  );
}
