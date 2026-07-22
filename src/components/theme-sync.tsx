"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { applyTheme, resolveTheme } from "@/lib/theme";

/**
 * Re-applies the saved theme after client navigations / server-action redirects,
 * which can otherwise briefly drop the `dark` class on <html>.
 */
export function ThemeSync() {
  const pathname = usePathname();

  useEffect(() => {
    applyTheme(resolveTheme());
  }, [pathname]);

  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === "visible") {
        applyTheme(resolveTheme());
      }
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  return null;
}
