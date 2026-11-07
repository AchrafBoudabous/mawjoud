"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { getDictionary } from "@/lib/i18n";

/** Registers the service worker (production only) and shows a calm
 *  banner while the device is offline. */
export function OfflineSupport() {
  const dict = getDictionary();
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.error("Service worker registration failed:", err);
      });
    }
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!offline) return null;

  return (
    <div role="status" className="sticky top-16 z-[1090] border-b border-warn-border/60 bg-warn-bg text-warn-text">
      <p className="mx-auto flex w-full max-w-wide items-center gap-2 px-4 py-2 text-sm font-medium md:px-6">
        <Icon name="offline" className="size-4 shrink-0" />
        {dict.offline.banner}
      </p>
    </div>
  );
}
