"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Command, X } from "lucide-react";

/**
 * Toast d'onboarding Cmd+K qui apparaît à la première visite
 * Se ferme automatiquement après 8s ou au clic
 */
export function CommandPaletteHint() {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Vérifier si l'utilisateur a déjà vu le hint
    const hasSeenHint = localStorage.getItem("paova_cmd_k_hint_seen");
    
    if (!hasSeenHint) {
      // Afficher après 2 secondes
      const timer = setTimeout(() => setShow(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    if (show && !dismissed) {
      // Auto-fermer après 8 secondes
      const timer = setTimeout(() => handleDismiss(), 8000);
      return () => clearTimeout(timer);
    }
  }, [show, dismissed]);

  const handleDismiss = () => {
    setDismissed(true);
    setShow(false);
    localStorage.setItem("paova_cmd_k_hint_seen", "true");
  };

  const isMac = typeof navigator !== "undefined" && navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  const modifier = isMac ? "⌘" : "Ctrl";

  return (
    <AnimatePresence>
      {show && !dismissed ? (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.98 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-6 right-6 z-50 max-w-sm"
        >
          <div className="rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_70%,var(--color-foreground))] bg-[var(--color-surface)] p-4 shadow-[0_16px_48px_rgba(0,0,0,0.25)] backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--color-brand)_12%,transparent)] text-[var(--color-brand)]">
                <Command size={18} strokeWidth={1.85} />
              </div>
              <div className="flex-1">
                <p className="text-[14px] font-semibold tracking-tight text-[var(--color-foreground)]">
                  Nouveau : Recherche rapide
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-[var(--color-muted)]">
                  Appuyez sur{" "}
                  <kbd className="inline-flex items-center gap-0.5 rounded border border-[var(--color-border)] bg-[var(--color-surface-2)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--color-foreground)]">
                    {modifier}K
                  </kbd>{" "}
                  pour rechercher rapidement signatures, formulaires et naviguer dans le dashboard.
                </p>
              </div>
              <button
                onClick={handleDismiss}
                className="shrink-0 rounded-lg p-1 text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)]"
                aria-label="Fermer"
              >
                <X size={16} strokeWidth={1.85} />
              </button>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
