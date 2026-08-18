import type { Metadata } from "next";
import { PageContainer } from "@/components/PageContainer";
import { PharmacistNotice } from "@/components/PharmacistNotice";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Espace pharmacien — Mawjoud",
  robots: { index: false, follow: false },
};

export default function PharmacienLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageContainer>
      <SiteHeader />

      <PharmacistNotice />

      {children}

      <SiteFooter />
    </PageContainer>
  );
}
