"use client";

import { useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { getDictionary } from "@/lib/i18n";
import { BUTTON_BASE, BUTTON_PRIMARY } from "@/lib/ui";

const RETRY_MS = 10_000;

/**
 * The fallback page is served for ANY failed navigation, which is either
 * "this phone is offline" or "the phone is online but the site cannot be
 * reached". Say which, and quietly retry so the page recovers by itself
 * the moment the original URL answers again.
 */
export function OfflineHero() {
  const dict = getDictionary();
  const t = dict.offline;
  const [deviceOnline, setDeviceOnline] = useState(true);

  useEffect(() => {
    const update = () => setDeviceOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);

    // The worker serves this page under the URL the user asked for, so
    // probing location.href tells us when that page is reachable again.
    const id = setInterval(async () => {
      if (!navigator.onLine) return;
      try {
        const res = await fetch(window.location.href, { method: "HEAD", cache: "no-store" });
        if (res.ok && window.location.pathname !== "/hors-ligne") window.location.reload();
      } catch {
        /* still unreachable */
      }
    }, RETRY_MS);

    return () => {
      clearInterval(id);
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return (
    <EmptyState
      headingLevel={1}
      icon="offline"
      title={deviceOnline ? t.serverTitle : t.title}
      body={deviceOnline ? t.serverBody : t.body}
      action={
        // A full reload on purpose: a client navigation needs an RSC fetch,
        // which is exactly what just failed.
        // eslint-disable-next-line @next/next/no-html-link-for-pages
        <a href="/" className={`${BUTTON_BASE} ${BUTTON_PRIMARY}`}>
          {dict.offline.retry}
        </a>
      }
    />
  );
}
