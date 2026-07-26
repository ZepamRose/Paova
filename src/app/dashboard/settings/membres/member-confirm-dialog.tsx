"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1] as const;

const ease =
  "transition-[transform,background-color,border-color,box-shadow,filter,opacity] duration-[200ms] ease-[cubic-bezier(0.22,1,0.36,1)]";

export function MemberConfirmDialog({
  open,
  onClose,
  title,
  description,
  confirmLabel,
  pendingLabel,
  tone = "default",
  onConfirm,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  confirmLabel: string;
  pendingLabel: string;
  tone?: "default" | "danger";
  onConfirm: () => void;
  children?: ReactNode;
}) {
  const titleId = useId();
  const descId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const reduced = useReducedMotion() ?? false;
  const busyRef = useRef(false);

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

  const confirmCls =
    tone === "danger"
      ? `inline-flex h-11 min-h-11 flex-1 items-center justify-center rounded-xl bg-red-600 px-4 text-sm font-medium text-white shadow-[var(--elev-1)] ${ease} hover:-translate-y-px hover:brightness-[1.05] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 active:translate-y-0 sm:h-10 sm:min-h-10`
      : `inline-flex h-11 min-h-11 flex-1 items-center justify-center rounded-xl bg-[var(--color-brand)] px-4 text-sm font-medium text-[var(--color-on-brand)] shadow-[0_1px_0_rgba(255,255,255,0.12)_inset,var(--elev-1)] ${ease} hover:-translate-y-px hover:brightness-[1.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] active:translate-y-0 sm:h-10 sm:min-h-10`;

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
          <button
            type="button"
            aria-label="Fermer"
            className="absolute inset-0 bg-[color-mix(in_srgb,var(--color-foreground)_28%,transparent)] backdrop-blur-[2px]"
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descId}
            initial={reduced ? false : { opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: EASE }}
            className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_70%,transparent)] bg-[var(--color-surface)] p-5 shadow-[var(--elev-3)] sm:p-6"
          >
            <h2
              id={titleId}
              className="text-[1.05rem] font-semibold tracking-tight text-[var(--color-foreground)]"
            >
              {title}
            </h2>
            <p
              id={descId}
              className="mt-2 text-[13.5px] leading-relaxed text-[var(--color-muted)]"
            >
              {description}
            </p>
            {children ? <div className="mt-4">{children}</div> : null}
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                ref={cancelRef}
                type="button"
                onClick={onClose}
                className={`inline-flex h-11 min-h-11 flex-1 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm font-medium text-[var(--color-foreground)] ${ease} hover:bg-[var(--color-surface-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] active:scale-[0.99] sm:h-10 sm:min-h-10 sm:flex-none`}
              >
                Annuler
              </button>
              <button
                type="button"
                className={confirmCls}
                onClick={() => {
                  if (busyRef.current) return;
                  busyRef.current = true;
                  onConfirm();
                }}
              >
                {confirmLabel}
              </button>
            </div>
            <span className="sr-only">{pendingLabel}</span>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
