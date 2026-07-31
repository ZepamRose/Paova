"use client";

import { Search } from "lucide-react";

/**
 * Bouton recherche global avec hint Cmd+K
 * Déclenche l'ouverture de la CommandPalette
 */
export function SearchTrigger({ onClick }: { onClick: () => void }) {
  const isMac = typeof navigator !== "undefined" && navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  const modifier = isMac ? "⌘" : "Ctrl";

  return (
    <button
      onClick={onClick}
      className="group relative flex h-9 items-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--color-border)_70%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_92%,var(--color-surface-2))] px-3 text-[13px] text-[var(--color-muted)] shadow-[var(--elev-1)] transition-[background-color,border-color,box-shadow,transform] duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px hover:border-[color-mix(in_srgb,var(--color-border)_88%,var(--color-foreground))] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)] hover:shadow-[var(--elev-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] active:translate-y-0 active:scale-[0.99]"
      aria-label="Rechercher (Cmd+K)"
    >
      <Search size={14} strokeWidth={1.85} aria-hidden />
      <span className="hidden sm:inline">Rechercher</span>
      <kbd className="ml-1 hidden items-center gap-0.5 rounded-md border border-[color-mix(in_srgb,var(--color-border)_60%,transparent)] bg-[var(--color-surface)] px-1.5 py-0.5 text-[10.5px] font-medium text-[var(--color-muted)] shadow-sm transition-colors duration-150 group-hover:border-[var(--color-border)] group-hover:text-[var(--color-foreground)] sm:inline-flex">
        {modifier}K
      </kbd>
    </button>
  );
}
