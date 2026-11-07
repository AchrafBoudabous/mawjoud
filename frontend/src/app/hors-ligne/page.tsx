import type { Metadata } from "next";
import { OfflineHero } from "@/app/hors-ligne/OfflineHero";
import { OfflinePages } from "@/app/hors-ligne/OfflinePages";
import { Disclaimer } from "@/components/Disclaimer";
import { PageContainer } from "@/components/PageContainer";

export const metadata: Metadata = {
  title: "Hors ligne — Mawjoud",
  robots: { index: false },
};

/** Precached by /sw.js and served when a page cannot be fetched and this
 *  phone has no copy of it. */
export default function OfflinePage() {
  return (
    <PageContainer>
      <OfflineHero />
      <OfflinePages />
      <Disclaimer />
    </PageContainer>
  );
}
