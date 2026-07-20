import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SafeSign — Décharges de responsabilité en ligne",
  description:
    "Faites signer vos décharges de responsabilité en ligne. Simple, sécurisé, conforme RGPD, hébergé en Europe.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
