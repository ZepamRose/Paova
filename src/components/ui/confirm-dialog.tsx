"use client";

/**
 * ConfirmDialog — generic confirmation modal for Paova.
 *
 * Replaces all window.confirm() / window.alert() calls.
 * Rendered via a portal so it sits above every other layer.
 *
 * Usage:
 *   <ConfirmDialog
 *     open={open}
 *     onClose={() => setOpen(false)}
 *     onConfirm={handleConfirm}
 *     title="Supprimer cette activité ?"
 *     description="Cette action est définitive."
 *     confirmLabel="Supprimer définitivement"
 *     pendingLabel="Suppression…"
 *     tone="danger"
 *     pending={isDeleting}
 *   />
 */

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Loader2 } from "lucide-react";

const EASE = [0.22, 1, 0.36, 1] as const;

const ease =
  "transition-[transform,background-color,border-color,box-shadow,filter,opacity] duration-[200ms] ease-[cubic-bezier(0.22,1,0.36,1)]";

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  /** Called when the user clicks the confirm button. */
  onConfirm: () => void;
  title: string;
  /** Main description shown below the title. */
  description: ReactNode;
  /** Label on the confirm button (idle state). */
  confirmLabel: string;
  /** Label + aria announcement during async operation. */
  pendingLabel?: string;
  /** Visual tone of the confirm button. Default is brand colour. */
  tone?: "default" | "danger";
  /** When true the confirm button shows a spinner and both buttons are disabled. */
  pending?: boolean;
  /** Optional extra content rendered between description and buttons. */
  children?: ReactNode;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  pendingLabel = "En cours…",
  tone = "default",
  pending = false,
  children,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const reduced = useReducedMotion() ?? false;

  // Scroll lock + Escape
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !pending) {
        e.preventDefault();
        onClose();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose, pending]);

  // Auto-focus "Annuler" when there is no child form
  const hasForm = Boolean(children);
  useEffect(() => {
    if (!open || hasForm) return;
    const t = window.setTimeout(() => cancelRef.current?.focus(), 40);
    return () => window.clearTimeout(t);
  }, [open, hasForm]);

  if (typeof document === "undefined") return null;

  const confirmBtnCls =
    tone === "danger"
      ? `inline-flex h-11 min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white shadow-[var(--elev-1)] ${ease} hover:-translate-y-px hover:brightness-[1.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 sm:h-10 sm:min-h-10`
      : `inline-flex h-11 min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--color-brand)] px-4 text-sm font-semibold text-[var(--color-on-brand)] shadow-[0_1px_0_rgba(255,255,255,0.12)_inset,var(--elev-1)] ${ease} hover:-translate-y-px hover:brightness-[1.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 sm:h-10 sm:min-h-10`;

  const cancelBtnCls = `inline-flex h-11 min-h-11 flex-1 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm font-medium text-[var(--color-foreground)] ${ease} hover:bg-[var(--color-surface-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 sm:h-10 sm:min-h-10 sm:flex-none`;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[80] flex items-end justify-center p-3 sm:items-center sm:p-4"
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16, ease: EASE }}
        >
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Fermer"
            disabled={pending}
            className="absolute inset-0 bg-[color-mix(in_srgb,var(--color-foreground)_28%,transparent)] backdrop-blur-[2px] disabled:pointer-events-none"
            onClick={onClose}
          />

          {/* Card */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descId}
            aria-busy={pending}
            initial={reduced ? false : { opacity: 0, y: 14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.97 }}
            transition={{ duration: 0.22, ease: EASE }}
            className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_70%,transparent)] bg-[var(--color-surface)] p-5 shadow-[var(--elev-3)] sm:p-6"
          >
            <h2
              id={titleId}
              className="text-[1.05rem] font-semibold tracking-tight text-[var(--color-foreground)]"
            >
              {title}
            </h2>
            <div
              id={descId}
              className="mt-2 text-[13.5px] leading-relaxed text-[var(--color-muted)]"
            >
              {typeof description === "string" ? <p>{description}</p> : description}
            </div>

            {children ? <div className="mt-4">{children}</div> : null}

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                ref={cancelRef}
                type="button"
                disabled={pending}
                onClick={onClose}
                className={cancelBtnCls}
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={onConfirm}
                className={confirmBtnCls}
              >
                {pending ? (
                  <>
                    <Loader2 size={14} strokeWidth={2.2} className="animate-spin" aria-hidden />
                    <span>{pendingLabel}</span>
                  </>
                ) : (
                  confirmLabel
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
