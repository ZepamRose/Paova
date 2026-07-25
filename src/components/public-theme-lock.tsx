"use client";

import { useEffect } from "react";
import type { PublicTheme } from "@/lib/branding";
import { applyTheme, resolveTheme } from "@/lib/theme";

/**
 * Forces the document theme on public waiver pages without persisting it
 * to the visitor's dashboard preference. Restores the saved theme on leave.
 */
export function PublicThemeLock({ theme }: { theme: PublicTheme }) {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.style.colorScheme = theme;

    return () => {
      applyTheme(resolveTheme());
    };
  }, [theme]);

  return null;
}

/** Inline script to apply the public theme before paint (avoids flash). */
export function PublicThemeScript({ theme }: { theme: PublicTheme }) {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `(function(){try{var t=${JSON.stringify(theme)};document.documentElement.classList.toggle('dark',t==='dark');document.documentElement.style.colorScheme=t;}catch(e){}})();`,
      }}
    />
  );
}
