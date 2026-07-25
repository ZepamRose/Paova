"use client";

import { useEffect, useState } from "react";
import { applyTheme, resolveTheme, type Theme } from "@/lib/theme";

export function ThemeToggle({
  className = "",
  variant = "default",
}: {
  className?: string;
  /** `ghost` = quiet utility (dashboard chrome). */
  variant?: "default" | "ghost";
}) {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const current = resolveTheme();
    setTheme(current);
    applyTheme(current);
    setMounted(true);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
  }

  const isGhost = variant === "ghost";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Passer en clair" : "Passer en sombre"}
      title={theme === "dark" ? "Mode clair" : "Mode sombre"}
      className={
        isGhost
          ? `flex h-8 w-8 items-center justify-center rounded-lg border border-[color-mix(in_srgb,var(--color-border)_55%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_90%,var(--color-surface-2))] transition-[background-color,border-color] duration-150 hover:border-[color-mix(in_srgb,var(--color-border)_80%,transparent)] hover:bg-[var(--color-surface-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] ${className}`
          : `flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--elev-1)] transition-[color,background-color,border-color,transform,box-shadow] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px hover:border-[color-mix(in_srgb,var(--color-border)_50%,var(--color-muted))] hover:bg-[var(--color-surface-2)] hover:shadow-[var(--elev-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] active:scale-[0.985] ${className}`
      }
    >
      {!mounted ? (
        <span className="block h-4 w-4" />
      ) : theme === "dark" ? (
        /* Sun — warm amber when switching to light */
        <svg
          width={isGhost ? 16 : 18}
          height={isGhost ? 16 : 18}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#e8a93a"
          strokeWidth="1.85"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <circle cx="12" cy="12" r="4" fill="#e8a93a" fillOpacity="0.22" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        /* Moon — washed pale yellow in light mode */
        <svg
          width={isGhost ? 16 : 18}
          height={isGhost ? 16 : 18}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#c4b48a"
          strokeWidth="1.85"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path
            d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"
            fill="#c4b48a"
            fillOpacity="0.18"
          />
        </svg>
      )}
    </button>
  );
}
