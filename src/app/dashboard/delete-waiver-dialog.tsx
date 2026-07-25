"use client";

import { useEffect, useId, useRef } from "react";
import { useFormStatus } from "react-dom";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, Archive } from "lucide-react";
import { deleteTemplate } from "./waivers/actions";
import { PendingSubmitButton } from "./pending-submit-button";

const EASE = [0.22, 1, 0.36, 1] as const;

function ArchiveSubmitButton() {
  return (
    <PendingSubmitButton
      pendingLabel="Archivage…"
      idle={
        <>
          <Archive size={14} strokeWidth={1.9} aria-hidden />
          <span className="whitespace-nowrap">Archiver</span>
        </>
      }
      className="inline-flex h-11 min-h-11 items-center justify-center gap-1.5 rounded-xl bg-[var(--color-foreground)] px-4 text-sm font-medium text-[var(--color-background)] shadow-[0_1px_0_rgba(255,255,255,0.12)_inset,var(--elev-1)] transition-[transform,box-shadow,filter,opacity] duration-200 ease-out hover:-translate-y-px hover:brightness-[1.06] hover:shadow-[var(--elev-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--color-foreground)_28%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)] active:translate-y-0 active:scale-[0.985] disabled:pointer-events-none disabled:opacity-75 sm:h-10 sm:min-h-10"
    />
  );
}

function ArchiveCancelButton({
  onClose,
  cancelRef,
}: {
  onClose: () => void;
  cancelRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      ref={cancelRef}
      type="button"
      onClick={onClose}
      disabled={pending}
      className="inline-flex h-11 min-h-11 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm font-medium text-[var(--color-foreground)] transition-[background-color,border-color,transform,box-shadow,opacity] duration-200 ease-out hover:bg-[var(--color-surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--color-foreground)_22%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)] active:scale-[0.985] disabled:pointer-events-none disabled:opacity-60 sm:h-10 sm:min-h-10"
    >
      Annuler
    </button>
  );
}

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
              className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(120%_80%_at_50%_-20%,color-mix(in_srgb,var(--color-foreground)_7%,transparent),transparent)]"
              aria-hidden
            />

            <div className="relative px-5 pb-5 pt-6 sm:px-6 sm:pb-6 sm:pt-7">
              <div className="flex items-start gap-3.5">
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-surface-2)] text-[var(--color-foreground)]/75 ring-1 ring-[color-mix(in_srgb,var(--color-border)_80%,transparent)]">
                  <Archive size={18} strokeWidth={1.75} aria-hidden />
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
                      Elle passera dans{" "}
                      <span className="font-medium text-[var(--color-foreground)]/80">
                        Archivées
                      </span>{" "}
                      sur le tableau de bord et n&apos;acceptera plus de nouvelles
                      signatures.
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
                  Retrouvez-la ensuite dans{" "}
                  <span className="font-medium text-[var(--color-foreground)]/80">
                    Archivées
                  </span>{" "}
                  sur le tableau de bord.
                </p>
                <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end sm:gap-2">
                  <ArchiveCancelButton onClose={onClose} cancelRef={cancelRef} />
                  <ArchiveSubmitButton />
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
