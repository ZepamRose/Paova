"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { applyTheme, resolveTheme } from "@/lib/theme";

function isPublicWaiverPath(pathname: string | null) {
  return Boolean(pathname?.startsWith("/w/"));
}

/**
 * Re-applies the saved theme after client navigations / server-action redirects,
 * which can otherwise briefly drop the `dark` class on <html>.
 * Skips public waiver pages — those force the business public_theme instead.
 */
export function ThemeSync() {
  const pathname = usePathname();

  useEffect(() => {
    if (isPublicWaiverPath(pathname)) return;
    applyTheme(resolveTheme());
  }, [pathname]);

  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState !== "visible") return;
      if (isPublicWaiverPath(pathname)) return;
      applyTheme(resolveTheme());
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [pathname]);

  return null;
}
