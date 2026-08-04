"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { X, ArrowRight } from "lucide-react";
import { createPortal } from "react-dom";
import { GroupProgressBar } from "@/components/groups/group-progress";
import { resolveGroupSigningState } from "@/lib/groups/signing-state";

type CompletedSessionModalProps = {
  session: {
    id: string;
    name: string;
    template_title: string;
    status: string;
    total: number;
    signed: number;
    end_time: string | null;
    scheduled_at?: string | null;
    start_time?: string | null;
    duration_minutes?: number | null;
    requires_signature: boolean;
    /** V3: mode de signature — optional for backward compat */
    signature_mode?: string | null;
    /** V3: représentant déjà signé — optional for backward compat */
    rep_signed?: boolean | null;
  };
  open: boolean;
  onClose: () => void;
};

const ease = "ease-[cubic-bezier(0.22,1,0.36,1)]";
const motion = `duration-[180ms] ${ease}`;

/** "Aujourd'hui", "Hier", ou "lundi 28 juillet" */
function naturalDateLabel(date: Date): string {
  const now = new Date();
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (sameDay(date, now)) return "Aujourd'hui";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(date, yesterday)) return "Hier";
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (sameDay(date, tomorrow)) return "Demain";
  return date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h${m.toString().padStart(2, "0")}`;
}

export function CompletedSessionModal({
  session,
  open,
  onClose,
}: CompletedSessionModalProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open, onClose]);

  if (!open) return null;

  // ── Données dérivées ──────────────────────────────────────────────────
  const sigState = resolveGroupSigningState(session);
  const startDate = session.start_time ? new Date(session.start_time) : null;
  const endDate = session.end_time ? new Date(session.end_time) : null;

  // Si end_time absent mais duration connue, on le calcule
  const computedEnd = endDate
    ? endDate
    : startDate && session.duration_minutes
      ? new Date(startDate.getTime() + session.duration_minutes * 60_000)
      : null;

  const dateLabel = startDate ? naturalDateLabel(startDate) : null;

  const timeRange = startDate && computedEnd
    ? `${fmtTime(session.start_time!)} → ${fmtTime(computedEnd.toISOString())}`
    : startDate
      ? fmtTime(session.start_time!)
      : null;

  const durationLabel = session.duration_minutes
    ? formatDuration(session.duration_minutes)
    : startDate && computedEnd
      ? formatDuration(Math.round((computedEnd.getTime() - startDate.getTime()) / 60_000))
      : null;

  const allSigned = session.requires_signature && sigState.allCovered;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center bg-black/40 p-4 sm:p-6 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        ref={ref}
        className="relative w-full max-w-md animate-in zoom-in-95 duration-200"
      >
        <div className="rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_65%,transparent)] bg-[var(--color-surface)] shadow-[0_24px_48px_-12px_rgba(0,0,0,0.25)] ring-1 ring-black/5 dark:ring-white/10 overflow-hidden">

          {/* ── Header ──────────────────────────────────────────────── */}
          <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
            <div className="flex-1 min-w-0">
              <div className="mb-1.5">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                  allSigned
                    ? "bg-[color-mix(in_srgb,#059669_10%,transparent)] text-[#059669]"
                    : "bg-[color-mix(in_srgb,var(--color-muted)_10%,transparent)] text-[var(--color-muted)]"
                }`}>
                  <span aria-hidden>✓</span>
                  Terminée
                </span>
              </div>
              <h2
                id="modal-title"
                className="text-[16px] font-bold leading-tight tracking-tight text-[var(--color-foreground)]"
              >
                {session.name}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--color-muted)] transition-[background-color,color] ${motion} hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)]`}
              aria-label="Fermer"
            >
              <X size={16} strokeWidth={2} />
            </button>
          </div>

          {/* ── Fiche récapitulative ─────────────────────────────── */}
          <div className="px-5 pb-5 space-y-4">

            {/* Bloc date / horaires */}
            {(dateLabel || timeRange || durationLabel) && (
              <div className="rounded-xl bg-[var(--color-surface-2)]/50 px-4 py-3 space-y-1.5">
                {dateLabel && (
                  <div className="flex items-center gap-2 text-[13px]">
                    <span className="text-[var(--color-muted)] w-4 text-center" aria-hidden>📅</span>
                    <span className="font-medium text-[var(--color-foreground)] capitalize">{dateLabel}</span>
                  </div>
                )}
                {timeRange && (
                  <div className="flex items-center gap-2 text-[13px]">
                    <span className="text-[var(--color-muted)] w-4 text-center" aria-hidden>🕐</span>
                    <span className="tabular-nums text-[var(--color-foreground)]/80">{timeRange}</span>
                    {durationLabel && (
                      <>
                        <span className="text-[var(--color-muted)]/30">·</span>
                        <span className="text-[var(--color-muted)]">{durationLabel}</span>
                      </>
                    )}
                  </div>
                )}
                {!timeRange && durationLabel && (
                  <div className="flex items-center gap-2 text-[13px]">
                    <span className="text-[var(--color-muted)] w-4 text-center" aria-hidden>⏱</span>
                    <span className="text-[var(--color-foreground)]/80">{durationLabel}</span>
                  </div>
                )}
                {/* Participants */}
                <div className="flex items-center gap-2 text-[13px]">
                  <span className="text-[var(--color-muted)] w-4 text-center" aria-hidden>👥</span>
                  <span className="font-semibold tabular-nums text-[var(--color-foreground)]">
                    {session.total}
                  </span>
                  <span className="text-[var(--color-muted)]">
                    participant{session.total !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            )}

            {/* Participants si pas de date */}
            {!dateLabel && !timeRange && !durationLabel && (
              <div className="flex items-center gap-2 text-[13px] rounded-xl bg-[var(--color-surface-2)]/50 px-4 py-3">
                <span className="text-[var(--color-muted)] w-4 text-center" aria-hidden>👥</span>
                <span className="font-semibold tabular-nums text-[var(--color-foreground)]">
                  {session.total}
                </span>
                <span className="text-[var(--color-muted)]">
                  participant{session.total !== 1 ? "s" : ""}
                </span>
              </div>
            )}

            {/* ── Section participants / signatures ──────────────── */}
            <div className="rounded-xl border border-[color-mix(in_srgb,var(--color-border)_50%,transparent)] overflow-hidden">
              {session.requires_signature ? (
                <div className="px-4 py-3 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12px] font-semibold uppercase tracking-wide text-[var(--color-muted)]/70">
                      Signatures
                    </span>
                    {sigState.isRepMode ? (
                      <span className={`text-[13px] font-bold ${allSigned ? "text-[#059669]" : "text-[var(--color-foreground)]"}`}>
                        {allSigned ? "Représentant ✓" : "En attente"}
                      </span>
                    ) : (
                      <span className={`text-[13px] font-bold tabular-nums ${allSigned ? "text-[#059669]" : "text-[var(--color-foreground)]"}`}>
                        {sigState.coveredSigned}
                        <span className="font-normal text-[var(--color-muted)]">/{session.total}</span>
                      </span>
                    )}
                  </div>
                  {session.total > 0 && !sigState.isRepMode && (
                    <GroupProgressBar
                      signed={sigState.coveredSigned}
                      total={session.total}
                      variant="dashboard"
                    />
                  )}
                  {session.template_title && (
                    <p className="text-[12px] text-[var(--color-muted)]">
                      Décharge :{" "}
                      <span className="font-medium text-[var(--color-foreground)]/70">
                        {session.template_title}
                      </span>
                    </p>
                  )}
                </div>
              ) : (
                <div className="px-4 py-3 space-y-1">
                  <span className="text-[12px] font-semibold uppercase tracking-wide text-[var(--color-muted)]/70">
                    Participants
                  </span>
                  <p className="text-[20px] font-bold tabular-nums text-[var(--color-foreground)]">
                    {session.total}
                    <span className="ml-2 text-[14px] font-normal text-[var(--color-muted)]">
                      participant{session.total !== 1 ? "s" : ""}
                    </span>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ── Footer ──────────────────────────────────────────── */}
          <div className="flex items-center justify-between gap-3 border-t border-[color-mix(in_srgb,var(--color-border)_40%,transparent)] px-5 py-3.5">
            <button
              type="button"
              onClick={onClose}
              className={`inline-flex h-9 items-center justify-center rounded-lg px-4 text-[13px] font-semibold text-[var(--color-foreground)]/70 transition-[background-color,color] ${motion} hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)]`}
            >
              Fermer
            </button>
            <Link
              href={`/dashboard/groupes/${session.id}`}
              className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[color-mix(in_srgb,var(--color-border)_70%,transparent)] bg-[var(--color-surface)] px-3.5 text-[13px] font-semibold text-[var(--color-foreground)] shadow-sm transition-[background-color,transform,box-shadow,border-color] ${motion} hover:-translate-y-px hover:bg-[var(--color-surface-2)] hover:shadow-md`}
            >
              Voir l&apos;activité
              <ArrowRight size={14} strokeWidth={2} />
            </Link>
          </div>

        </div>
      </div>
    </div>,
    document.body
  );
}
