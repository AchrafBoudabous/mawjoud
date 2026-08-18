import type { Metadata, Viewport } from "next";
import { Public_Sans } from "next/font/google";
import "./globals.css";

const publicSans = Public_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-public-sans",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f766e",
};

export const metadata: Metadata = {
  applicationName: "Mawjoud",
  title: "Mawjoud — Disponibilité des médicaments",
  description:
    "Vérifiez la disponibilité de vos médicaments dans les pharmacies de Bizerte, avec des informations signalées par la communauté.",
  openGraph: {
    type: "website",
    locale: "fr_TN",
    siteName: "Mawjoud",
    title: "Mawjoud — Disponibilité des médicaments",
    description:
      "Vérifiez la disponibilité de vos médicaments dans les pharmacies de Bizerte, avec des informations signalées par la communauté.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={publicSans.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
