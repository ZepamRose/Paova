"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Eye, X } from "lucide-react";
import {
  extractSubjectsFromAnswers,
  formatSubjectsContextSummary,
} from "@/lib/submissions";
import {
  buildAnswerDisplayRows,
  type DisplayField,
} from "@/lib/submissions/display";
import { PdfDownloadButton } from "./pdf-download-button";
import { EraseSubmissionButton } from "./erase-submission-button";

const EASE = [0.22, 1, 0.36, 1] as const;
const MOTION = "duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)]";

export type SubmissionDetailData = {
  id: string;
  templateId: string;
  signerName: string;
  signerEmail: string | null;
  signedAt: string;
  fields: DisplayField[];
  answers: Record<string, unknown>;
  proofReference?: string | null;
  templateTitle?: string | null;
};

function formatSignedAt(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function FieldRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-1 py-3 first:pt-0.5 last:pb-0.5 sm:grid-cols-[8.75rem_minmax(0,1fr)] sm:items-start sm:gap-6">
      <dt className="text-[13px] leading-snug text-[var(--color-muted)]">
        {label}
      </dt>
      <dd className="min-w-0 text-[13.5px] leading-snug tracking-tight text-[var(--color-foreground)]">
        {children}
      </dd>
    </div>
  );
}

export function SubmissionDetailDialog({
  submission,
  triggerClassName,
  open: openProp,
  onOpenChange,
  canErase = false,
  eraseReturnTo,
}: {
  submission: SubmissionDetailData;
  triggerClassName?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Owner/admin only — GDPR erasure is destructive and irreversible. */
  canErase?: boolean;
  eraseReturnTo?: "waiver" | "signatures";
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : uncontrolledOpen;

  const setOpen = useCallback(
    (next: boolean) => {
      if (!isControlled) setUncontrolledOpen(next);
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange],
  );

  const [mounted, setMounted] = useState(false);
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const reduced = useReducedMotion() ?? false;

  const pdfHref = `/dashboard/waivers/${submission.templateId}/submissions/${submission.id}/pdf`;
  const rows = buildAnswerDisplayRows(submission.fields, submission.answers);
  const subjectsContext = formatSubjectsContextSummary(
    extractSubjectsFromAnswers(submission.fields, submission.answers),
  );
  const initial = (submission.signerName?.trim()?.charAt(0) || "?").toUpperCase();

  const metaParts = [
    formatSignedAt(submission.signedAt),
    submission.signerEmail || null,
    submission.proofReference || null,
  ].filter(Boolean);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = window.setTimeout(() => closeRef.current?.focus(), 40);

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prev;
      window.clearTimeout(t);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, setOpen]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          triggerClassName ??
          `inline-flex h-9 items-center gap-1.5 rounded-xl border border-[color-mix(in_srgb,var(--color-brand)_28%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-brand)_9%,var(--color-surface))] px-3 text-[13px] font-medium tracking-tight text-[color-mix(in_srgb,var(--color-brand)_92%,var(--color-foreground))] shadow-[var(--elev-1)] transition-[background-color,transform,box-shadow,border-color,color] ${MOTION} hover:-translate-y-px hover:border-[color-mix(in_srgb,var(--color-brand)_40%,var(--color-border))] hover:bg-[color-mix(in_srgb,var(--color-brand)_14%,var(--color-surface))] hover:shadow-[var(--elev-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] active:translate-y-0 active:scale-[0.99]`
        }
      >
        <Eye size={14} strokeWidth={1.85} aria-hidden />
        Détails
      </button>

      {mounted
        ? createPortal(
            <AnimatePresence>
              {open ? (
                <motion.div
                  key={`submission-detail-${submission.id}`}
                  className="fixed inset-0 z-[80] flex items-end justify-center p-3 sm:items-center sm:p-6"
                  initial={reduced ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15, ease: "linear" }}
                >
                  <button
                    type="button"
                    aria-label="Fermer"
                    onClick={() => setOpen(false)}
                    className="absolute inset-0 bg-black/40 dark:bg-black/55"
                  />

                  <motion.div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby={titleId}
                    initial={
                      reduced ? false : { y: 10, scale: 0.98, opacity: 0.98 }
                    }
                    animate={{ y: 0, scale: 1, opacity: 1 }}
                    exit={
                      reduced ? undefined : { y: 8, scale: 0.99, opacity: 0 }
                    }
                    transition={{ duration: 0.22, ease: EASE }}
                    className="relative z-10 flex max-h-[min(90vh,40rem)] w-full max-w-[28rem] flex-col overflow-hidden rounded-[1.15rem] border border-[color-mix(in_srgb,var(--color-border)_85%,var(--color-foreground))] bg-[var(--color-surface)] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_24px_48px_-20px_rgba(15,23,42,0.28)] will-change-transform"
                  >
                    <div
                      className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(110%_90%_at_20%_-30%,color-mix(in_srgb,var(--color-brand)_12%,transparent),transparent)]"
                      aria-hidden
                    />

                    {/* Header */}
                    <div className="relative flex items-start gap-3.5 px-5 pb-4 pt-5 sm:px-6 sm:pt-6">
                      <span
                        className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-brand)_11%,var(--color-surface))] text-[13px] font-semibold tracking-tight text-[var(--color-brand)] ring-1 ring-[color-mix(in_srgb,var(--color-brand)_16%,transparent)]"
                        aria-hidden
                      >
                        {initial}
                      </span>

                      <div className="min-w-0 flex-1 pr-9">
                        <h2
                          id={titleId}
                          className="truncate text-[1.125rem] font-semibold tracking-tight text-[var(--color-foreground)]"
                        >
                          {submission.signerName}
                        </h2>
                        {subjectsContext ? (
                          <p className="mt-1 text-[13px] leading-snug text-[var(--color-foreground)]/78">
                            {subjectsContext}
                          </p>
                        ) : null}
                        <p className="mt-1.5 text-[12.5px] leading-relaxed text-[var(--color-muted)]">
                          {metaParts.join(" · ")}
                        </p>
                        {submission.templateTitle ? (
                          <p className="mt-0.5 truncate text-[12px] text-[var(--color-muted)]/70">
                            {submission.templateTitle}
                          </p>
                        ) : null}
                      </div>

                      <button
                        ref={closeRef}
                        type="button"
                        onClick={() => setOpen(false)}
                        className={`absolute right-3.5 top-3.5 inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-muted)] transition-[background-color,color,transform] ${MOTION} hover:bg-[color-mix(in_srgb,var(--color-surface-2)_80%,transparent)] hover:text-[var(--color-foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] active:scale-[0.97] sm:right-4 sm:top-4`}
                        aria-label="Fermer"
                      >
                        <X size={15} strokeWidth={1.85} aria-hidden />
                      </button>
                    </div>

                    {/* Body */}
                    <div className="relative min-h-0 flex-1 overflow-y-auto px-5 pb-1 sm:px-6">
                      <div className="rounded-xl bg-[color-mix(in_srgb,var(--color-background)_72%,var(--color-surface-2))] px-4 py-1 ring-1 ring-[color-mix(in_srgb,var(--color-border)_55%,transparent)]">
                        <dl className="divide-y divide-[color-mix(in_srgb,var(--color-border)_42%,transparent)]">
                          {rows.map((row) => {
                            if (row.kind === "subjects") {
                              return (
                                <FieldRow key={row.key} label={row.label}>
                                  {row.subjects.length === 0 ? (
                                    <span className="text-[var(--color-muted)]">
                                      —
                                    </span>
                                  ) : (
                                    <ul className="flex flex-col gap-2.5">
                                      {row.subjects.map((subject, index) => (
                                        <li
                                          key={`${row.key}-${index}-${subject.name}`}
                                        >
                                          <p className="font-medium">
                                            <span className="mr-1.5 tabular-nums text-[12.5px] font-normal text-[var(--color-muted)]">
                                              {index + 1}.
                                            </span>
                                            {subject.name}
                                          </p>
                                          {subject.dob ? (
                                            <p className="mt-0.5 pl-[1.15rem] text-[12.5px] text-[var(--color-muted)]">
                                              Né(e) le {subject.dob}
                                            </p>
                                          ) : null}
                                          {subject.note ? (
                                            <p className="mt-1 pl-[1.15rem] text-[13px] leading-snug text-[var(--color-foreground)]/80">
                                              {subject.note}
                                            </p>
                                          ) : null}
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </FieldRow>
                              );
                            }

                            return (
                              <FieldRow key={row.key} label={row.label}>
                                <p
                                  className={
                                    row.value === "—"
                                      ? "text-[var(--color-muted)]"
                                      : "whitespace-pre-wrap font-medium"
                                  }
                                >
                                  {row.value}
                                </p>
                              </FieldRow>
                            );
                          })}
                        </dl>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="relative flex flex-wrap items-center justify-end gap-3 px-5 py-4 sm:px-6">
                      <p className="mr-auto text-[12px] leading-relaxed text-[var(--color-muted)]">
                        Preuve légale en PDF
                      </p>
                      {canErase ? (
                        <EraseSubmissionButton
                          submissionId={submission.id}
                          signerName={submission.signerName}
                          returnTo={eraseReturnTo}
                        />
                      ) : null}
                      <PdfDownloadButton
                        href={pdfHref}
                        label="Télécharger"
                        className={`inline-flex h-9 items-center gap-1.5 rounded-xl bg-[var(--color-brand)] px-3.5 text-[13px] font-medium text-[var(--color-on-brand)] shadow-[0_1px_0_rgba(255,255,255,0.12)_inset,var(--elev-1)] transition-[transform,filter,box-shadow,opacity] ${MOTION} hover:-translate-y-px hover:brightness-[1.04] hover:shadow-[0_1px_0_rgba(255,255,255,0.16)_inset,0_8px_20px_-8px_color-mix(in_srgb,var(--color-brand)_48%,transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] active:translate-y-0 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-70`}
                      />
                    </div>
                  </motion.div>
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </>
  );
}
