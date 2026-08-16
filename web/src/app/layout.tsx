import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mawjoud — Disponibilité des médicaments",
  description:
    "Vérifiez la disponibilité de vos médicaments dans les pharmacies de Bizerte, avec des informations signalées par la communauté.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="antialiased">{children}</body>
    </html>
  );
}
