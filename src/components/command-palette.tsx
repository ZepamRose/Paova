"use client";

import { useEffect, useState, useCallback, createContext, useContext } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Search, FileText, Users, Home, Settings, FileCheck2 } from "lucide-react";

type SearchResult = {
  id: string;
  type: "signature" | "waiver" | "group";
  title: string;
  subtitle?: string;
  href: string;
};

// Context pour contrôler la palette depuis n'importe où
const CommandPaletteContext = createContext<{
  open: boolean;
  setOpen: (open: boolean) => void;
}>({
  open: false,
  setOpen: () => {},
});

export function useCommandPalette() {
  return useContext(CommandPaletteContext);
}

/**
 * Palette de commande globale (Cmd+K / Ctrl+K)
 * Navigation rapide + recherche de signatures
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Cmd+K / Ctrl+K pour ouvrir, ESC pour fermer
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Recherche avec debounce
  useEffect(() => {
    if (!search.trim() || !open) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const query = search.trim();

        // Recherche des signatures via fetch (RPC pas encore dans les types)
        const response = await fetch("/dashboard/signatures/search?" + new URLSearchParams({
          q: query,
          status: "signed",
        }));

        if (!response.ok) {
          setResults([]);
          return;
        }

        const data = await response.json() as {
          results?: Array<{
            id: string;
            signerName: string;
            signerEmail: string;
            templateTitle: string;
            signedAt: string;
          }>;
        };

        const signatureResults: SearchResult[] = (data.results ?? []).slice(0, 10).map((sig) => ({
          id: sig.id,
          type: "signature" as const,
          title: sig.signerName || sig.signerEmail || "Sans nom",
          subtitle: `${sig.templateTitle} · ${new Date(sig.signedAt).toLocaleDateString("fr-FR")}`,
          href: `/dashboard/signatures?q=${encodeURIComponent(sig.signerName || sig.signerEmail)}`,
        }));

        setResults(signatureResults);
      } catch (error) {
        console.error("Command palette search error:", error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [search, open]);

  const handleSelect = useCallback(
    (href: string) => {
      setOpen(false);
      setSearch("");
      router.push(href);
    },
    [router]
  );

  const shortcuts = [
    { icon: Home, label: "Tableau de bord", href: "/dashboard" },
    { icon: FileText, label: "Formulaires", href: "/dashboard" },
    { icon: FileCheck2, label: "Signatures", href: "/dashboard/signatures" },
    { icon: Users, label: "Équipe", href: "/dashboard/settings/membres" },
    { icon: Settings, label: "Réglages", href: "/dashboard/settings" },
  ];

  return (
    <CommandPaletteContext.Provider value={{ open, setOpen }}>
      {!open ? null : (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="fixed left-1/2 top-[20vh] z-50 w-full max-w-2xl -translate-x-1/2 px-4">
            <Command
              className="overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_85%,var(--color-foreground))] bg-[var(--color-surface)] shadow-[0_16px_70px_rgba(0,0,0,0.35)]"
              shouldFilter={false}
            >
              <div className="flex items-center border-b border-[color-mix(in_srgb,var(--color-border)_70%,transparent)] px-4">
                <Search
                  size={18}
                  strokeWidth={1.8}
                  className="mr-3 shrink-0 text-[var(--color-muted)]"
                  aria-hidden
                />
                <Command.Input
                  value={search}
                  onValueChange={setSearch}
                  placeholder="Rechercher signatures, formulaires..."
                  className="h-14 w-full bg-transparent text-[15px] text-[var(--color-foreground)] placeholder:text-[var(--color-muted)]/60 focus:outline-none"
                />
                <kbd className="ml-auto hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 py-1 text-[11px] font-medium text-[var(--color-muted)] sm:inline-block">
                  ESC
                </kbd>
              </div>

              <Command.List className="max-h-[min(60vh,400px)] overflow-y-auto overscroll-contain p-2">
                {!search && (
                  <Command.Group
                    heading="Navigation rapide"
                    className="px-2 pb-2 pt-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)]"
                  >
                    {shortcuts.map((shortcut) => {
                      const Icon = shortcut.icon;
                      return (
                        <Command.Item
                          key={shortcut.href}
                          onSelect={() => handleSelect(shortcut.href)}
                          className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] text-[var(--color-foreground)] transition-colors aria-selected:bg-[var(--color-surface-2)]"
                        >
                          <Icon size={16} strokeWidth={1.8} className="text-[var(--color-muted)]" />
                          {shortcut.label}
                        </Command.Item>
                      );
                    })}
                  </Command.Group>
                )}

                {search && loading && (
                  <div className="px-4 py-8 text-center text-[13px] text-[var(--color-muted)]">
                    Recherche en cours...
                  </div>
                )}

                {search && !loading && results.length === 0 && (
                  <Command.Empty className="px-4 py-8 text-center text-[13px] text-[var(--color-muted)]">
                    Aucun résultat pour « {search} »
                  </Command.Empty>
                )}

                {search && results.length > 0 && (
                  <Command.Group
                    heading="Signatures"
                    className="px-2 pb-2 pt-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)]"
                  >
                    {results.map((result) => (
                      <Command.Item
                        key={result.id}
                        onSelect={() => handleSelect(result.href)}
                        className="flex cursor-pointer flex-col gap-0.5 rounded-lg px-3 py-2.5 transition-colors aria-selected:bg-[var(--color-surface-2)]"
                      >
                        <div className="text-[14px] font-medium text-[var(--color-foreground)]">
                          {result.title}
                        </div>
                        {result.subtitle && (
                          <div className="text-[12px] text-[var(--color-muted)]">
                            {result.subtitle}
                          </div>
                        )}
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}
              </Command.List>
            </Command>
          </div>
        </>
      )}
    </CommandPaletteContext.Provider>
  );
}
