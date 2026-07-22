"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, Trash2 } from "lucide-react";
import { deleteTemplate } from "./waivers/actions";

const EASE = [0.22, 1, 0.36, 1] as const;

export function DeleteWaiverDialog({
  open,
  onClose,
  id,
  title,
  submissionCount = 0,
}: {
  open: boolean;
  onClose: () => void;
  id: string;
  title: string;
  submissionCount?: number;
}) {
  const titleId = useId();
  const descId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const reduced = useReducedMotion();

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

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key="delete-waiver-dialog"
          className="fixed inset-0 z-[80] flex items-end justify-center p-3 sm:items-center sm:p-4"
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16, ease: "linear" }}
        >
          {/* Fond uni sans blur : évite le banding à l’apparition. */}
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
            className="relative z-10 w-full max-w-[420px] overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_85%,var(--color-foreground))] bg-[var(--color-surface)] shadow-[var(--elev-3)] will-change-transform"
          >
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(120%_80%_at_50%_-20%,color-mix(in_srgb,#dc2626_14%,transparent),transparent)]"
              aria-hidden
            />

            <div className="relative px-5 pb-5 pt-6 sm:px-6 sm:pb-6 sm:pt-7">
              <div className="flex items-start gap-3.5">
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,#dc2626_10%,var(--color-surface))] text-red-600 ring-1 ring-[color-mix(in_srgb,#dc2626_16%,transparent)] dark:text-red-400">
                  <Trash2 size={18} strokeWidth={1.9} aria-hidden />
                </span>
                <div className="min-w-0 pt-0.5">
                  <h2
                    id={titleId}
                    className="text-[1.05rem] font-semibold tracking-tight text-[var(--color-foreground)]"
                  >
                    Archiver cette décharge ?
                  </h2>
                  <div
                    id={descId}
                    className="mt-2 space-y-1.5 text-[13.5px] leading-relaxed text-[var(--color-muted)]"
                  >
                    <p>
                      «{" "}
                      <span className="font-medium text-[var(--color-foreground)]/90">
                        {title}
                      </span>{" "}
                      »
                    </p>
                    <p>
                      Elle disparaîtra de votre tableau de bord et n&apos;acceptera
                      plus de nouvelles signatures.
                    </p>
                    <p>
                      Les signatures et preuves numériques déjà collectées seront
                      conservées.
                    </p>
                  </div>
                </div>
              </div>

              {submissionCount > 0 ? (
                <div className="mt-5 flex gap-3 rounded-xl border border-[color-mix(in_srgb,var(--color-brand)_22%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-brand)_6%,var(--color-background))] px-3.5 py-3.5">
                  <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--color-brand)_12%,transparent)] text-[var(--color-brand)]">
                    <AlertTriangle size={14} strokeWidth={1.9} aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium leading-snug text-[var(--color-foreground)]">
                      {submissionCount} signature
                      {submissionCount === 1 ? "" : "s"} conservée
                      {submissionCount === 1 ? "" : "s"}
                    </p>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--color-muted)]">
                      Vous pourrez toujours les retrouver via la recherche et les
                      exports, ou en restaurant la décharge.
                    </p>
                  </div>
                </div>
              ) : null}

              <form
                action={deleteTemplate}
                className="mt-6 border-t border-[color-mix(in_srgb,var(--color-border)_70%,transparent)] pt-5"
              >
                <input type="hidden" name="id" value={id} />
                <p className="mb-3.5 text-[12.5px] leading-relaxed text-[var(--color-muted)] sm:text-right">
                  Vous pourrez la restaurer plus tard depuis sa page détail.
                </p>
                <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end sm:gap-2">
                  <button
                    ref={cancelRef}
                    type="button"
                    onClick={onClose}
                    className="inline-flex h-11 min-h-11 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm font-medium text-[var(--color-foreground)] transition-[background-color,border-color,transform,box-shadow] duration-200 ease-out hover:bg-[var(--color-surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--color-foreground)_22%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)] active:scale-[0.985] sm:h-10 sm:min-h-10"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="inline-flex h-11 min-h-11 items-center justify-center gap-1.5 rounded-xl px-4 text-sm font-medium text-white shadow-[0_1px_0_rgba(255,255,255,0.16)_inset,0_8px_18px_-8px_rgba(220,38,38,0.55),0_2px_4px_-2px_rgba(127,29,29,0.25)] transition-[transform,box-shadow,filter] duration-200 ease-out hover:-translate-y-px hover:shadow-[0_1px_0_rgba(255,255,255,0.2)_inset,0_12px_22px_-8px_rgba(220,38,38,0.62),0_3px_6px_-2px_rgba(127,29,29,0.28)] hover:brightness-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)] active:translate-y-0 active:scale-[0.985] active:brightness-[0.98] sm:h-10 sm:min-h-10 dark:shadow-[0_1px_0_rgba(255,255,255,0.1)_inset,0_10px_22px_-10px_rgba(248,113,113,0.35)]"
                    style={{
                      backgroundImage:
                        "linear-gradient(to bottom, #ef4444, #dc2626)",
                    }}
                  >
                    <Trash2 size={14} strokeWidth={2} aria-hidden />
                    <span className="whitespace-nowrap">Archiver</span>
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
