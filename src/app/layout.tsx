import type { Metadata } from "next";
import { Instrument_Sans } from "next/font/google";
import { cookies } from "next/headers";
import { AuthSessionRecovery } from "@/components/auth-session-recovery";
import { ThemeSync } from "@/components/theme-sync";
import { NavigationProgress } from "@/components/navigation-progress";
import { THEME_COOKIE } from "@/lib/theme";
import "./globals.css";

const paovaSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-paova",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Paova — Toutes vos décharges, gérées au même endroit",
  description:
    "Remplacez le papier : collectez les signatures, gardez les preuves et retrouvez chaque dossier en quelques secondes. Hébergement européen, conforme RGPD.",
  icons: {
    icon: [
      { url: "/brand/PaovaFavicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/PaovaIcon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/brand/PaovaFavicon-180.png", sizes: "180x180" }],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get(THEME_COOKIE)?.value;
  const themeClass = themeCookie === "dark" ? "dark" : "";

  return (
    <html
      lang="fr"
      className={`${themeClass} ${paovaSans.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var k='theme';var c='paova-theme';var t=localStorage.getItem(k);if(t!=='dark'&&t!=='light'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}var d=t==='dark';document.documentElement.classList.toggle('dark',d);document.documentElement.style.colorScheme=t;document.cookie=c+'='+t+'; path=/; max-age=31536000; SameSite=Lax';}catch(e){}})();`,
          }}
        />
      </head>
      <body className={paovaSans.className}>
        <ThemeSync />
        <AuthSessionRecovery />
        <NavigationProgress />
        {children}
      </body>
    </html>
  );
}
