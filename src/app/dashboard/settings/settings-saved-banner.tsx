"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";

/**
 * High-visibility success banner after settings save.
 * Auto-dismisses and cleans the ?success query so a refresh stays clean.
 */
export function SettingsSavedBanner({ show }: { show: boolean }) {
  const router = useRouter();
  const reduced = useReducedMotion() ?? false;
  const [visible, setVisible] = useState(show);

  useEffect(() => {
    setVisible(show);
  }, [show]);

  useEffect(() => {
    if (!visible) return;
    const id = window.setTimeout(() => {
      setVisible(false);
      router.replace("/dashboard/settings", { scroll: false });
    }, 5200);
    return () => window.clearTimeout(id);
  }, [visible, router]);

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          role="status"
          aria-live="polite"
          initial={reduced ? false : { opacity: 0, y: -8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: -6 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-start gap-3.5 rounded-2xl border border-[color-mix(in_srgb,var(--color-brand)_40%,var(--color-border))] bg-[var(--color-surface)] px-4 py-4 shadow-[var(--elev-3)] ring-1 ring-[color-mix(in_srgb,var(--color-brand)_18%,transparent)] sm:gap-4 sm:px-5"
        >
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand)] text-[var(--color-on-brand)] shadow-[0_4px_12px_-4px_color-mix(in_srgb,var(--color-brand)_55%,transparent)]"
            aria-hidden
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </span>

          <div className="min-w-0 flex-1 pt-0.5">
            <p className="text-[15px] font-semibold tracking-tight text-[var(--color-foreground)]">
              Modifications enregistrées
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-[var(--color-muted)]">
              Logo, nom et couleur sont à jour sur vos pages publiques et vos
              PDF.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setVisible(false);
              router.replace("/dashboard/settings", { scroll: false });
            }}
            className="shrink-0 rounded-lg p-1.5 text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]"
            aria-label="Fermer"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
