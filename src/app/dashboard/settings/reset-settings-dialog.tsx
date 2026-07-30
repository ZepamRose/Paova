"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { RotateCcw } from "lucide-react";

const EASE = [0.22, 1, 0.36, 1] as const;

export function ResetSettingsDialog({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const titleId = useId();
  const descId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const reduced = useReducedMotion() ?? false;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = window.setTimeout(() => cancelRef.current?.focus(), 40);

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prev;
      window.clearTimeout(t);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key="reset-settings-dialog"
          className="fixed inset-0 z-[80] flex items-end justify-center p-3 sm:items-center sm:p-4"
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16, ease: "linear" }}
        >
          <button
            type="button"
            aria-label="Fermer"
            onClick={onClose}
            className="absolute inset-0 bg-black/45 dark:bg-black/55"
          />

          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descId}
            initial={reduced ? false : { y: 12, scale: 0.985 }}
            animate={{ y: 0, scale: 1 }}
            exit={reduced ? undefined : { y: 8, scale: 0.985 }}
            transition={{ duration: 0.24, ease: EASE }}
            className="relative z-10 w-full max-w-[400px] overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_85%,var(--color-foreground))] bg-[var(--color-surface)] shadow-[var(--elev-3)]"
          >
            <div className="px-5 pt-5 sm:px-6 sm:pt-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-[0.8rem] bg-[color-mix(in_srgb,var(--color-brand)_12%,transparent)] text-[var(--color-brand)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-brand)_16%,transparent)]">
                <RotateCcw size={18} strokeWidth={1.85} aria-hidden />
              </div>
              <h2
                id={titleId}
                className="mt-3.5 text-[1.0625rem] font-semibold tracking-tight text-[var(--color-foreground)]"
              >
                Restaurer les réglages par défaut ?
              </h2>
              <p
                id={descId}
                className="mt-1.5 text-[13.5px] leading-relaxed text-[var(--color-muted)]"
              >
                Les coordonnées et la personnalisation des e-mails seront
                réinitialisées.
                Le nom et le logo restent inchangés. Vous pourrez encore
                enregistrer ou annuler ensuite.
              </p>
            </div>

            <div className="mt-5 flex flex-col-reverse gap-2 border-t border-[color-mix(in_srgb,var(--color-border)_60%,transparent)] bg-[color-mix(in_srgb,var(--color-background)_40%,var(--color-surface))] px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
              <button
                ref={cancelRef}
                type="button"
                onClick={onClose}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm font-medium text-[var(--color-foreground)] transition-[background-color,transform] duration-200 hover:bg-[var(--color-surface-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[var(--color-foreground)] px-4 text-sm font-medium text-[var(--color-background)] shadow-[var(--elev-1)] transition-[transform,filter] duration-200 hover:-translate-y-px hover:brightness-[1.05] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]"
              >
                <RotateCcw size={14} strokeWidth={1.9} aria-hidden />
                Restaurer les réglages
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
