import type { Metadata, Viewport } from "next";
import { Figtree } from "next/font/google";
import { OfflineSupport } from "@/components/OfflineSupport";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getDictionary } from "@/lib/i18n";
import "./globals.css";

const figtree = Figtree({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-figtree",
});

function siteUrl(): URL {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  try {
    if (explicit) return new URL(explicit);
    if (vercel) return new URL(`https://${vercel}`);
  } catch {
    /* fall through */
  }
  return new URL("http://localhost:3000");
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfaf7" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1110" },
  ],
};

const DESCRIPTION =
  "Vérifiez la disponibilité de vos médicaments dans les pharmacies de toute la Tunisie, avec des informations signalées par la communauté et les pharmaciens.";

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  applicationName: "Mawjoud",
  title: "Mawjoud — Disponibilité des médicaments",
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    locale: "fr_TN",
    siteName: "Mawjoud",
    title: "Mawjoud — Disponibilité des médicaments",
    description: DESCRIPTION,
  },
  formatDetection: { telephone: false },
  icons: { apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "Mawjoud", statusBarStyle: "default" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const dict = getDictionary();

  return (
    // data-scroll-behavior: tells Next.js our smooth scrolling is
    // intentional (globals.css). suppressHydrationWarning: some browser
    // extensions (e.g. Bitdefender) add attributes to <html>/<body>
    // before React loads; that is not an app bug.
    <html lang="fr" dir="ltr" className={figtree.variable} data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className="flex min-h-dvh flex-col antialiased" suppressHydrationWarning>
        <a
          href="#contenu"
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[2000] focus:rounded-control focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-brand-700 focus:shadow-float"
        >
          {dict.common.skipToContent}
        </a>
        <SiteHeader />
        <OfflineSupport />
        <main id="contenu" className="flex flex-1 flex-col">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
