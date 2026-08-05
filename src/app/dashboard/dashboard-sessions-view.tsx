"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Calendar, Clock, CheckCircle2, Plus, Loader2, X, ArrowRight, ChevronRight } from "lucide-react";
import type { DashboardGroupRow } from "@/lib/dashboard/types";
import { resolveGroupSigningState } from "@/lib/groups/signing-state";
import { GroupProgressBar } from "@/components/groups/group-progress";
import {
  getSessionTimeInfo,
  formatSessionDuration,
  formatSessionDate,
} from "@/lib/session-time";
import { CompletedSessionModal } from "./completed-session-modal";
import { SessionActionsMenu } from "./groupes/session-actions-menu";
import { LiveCountdown } from "@/components/live-countdown";
import { LiveSessionManager, AnimatedSessionGrid, AnimatedSessionCard } from "@/components/live-session-manager";

/**
 * PAOVA V2 - Sessions View
 * Avec compteurs temps réel et déplacement automatique des cartes
 */

// ─── Session Quick View Modal ────────────────────────────────────────────────

type SessionQuickViewProps = {
  session: DashboardGroupRow;
  variant: "ongoing" | "upcoming";
  appUrl: string;
  open: boolean;
  onClose: () => void;
};

const ease = "ease-[cubic-bezier(0.22,1,0.36,1)]";
const motion = `duration-[180ms] ${ease}`;

export function SessionQuickViewModal({ session, variant, appUrl, open, onClose }: SessionQuickViewProps) {
  const [mounted, setMounted] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loadingQr, setLoadingQr] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const sigStateModal = resolveGroupSigningState(session);
  const pending = sigStateModal.total - sigStateModal.coveredSigned;
  const timeInfo = getSessionTimeInfo(session.start_time, session.end_time, session.duration_minutes);

  // Charger le QR si nécessaire
  useEffect(() => {
    if (!open || variant !== "ongoing" || qrDataUrl) return;

    async function loadQr() {
      setLoadingQr(true);
      try {
        const QRCode = (await import("qrcode")).default;
        const url = await QRCode.toDataURL(`${appUrl}/g/${session.public_token}`, {
          width: 240,
          margin: 1,
          color: { dark: "#0a0a0a", light: "#ffffff" },
        });
        setQrDataUrl(url);
      } finally {
        setLoadingQr(false);
      }
    }
    loadQr();
  }, [open, variant, qrDataUrl, appUrl, session.public_token]);

  if (!open || !mounted) return null;

  const statusContent = variant === "ongoing" ? (
    <div className={`flex items-start gap-3 rounded-xl p-4 ${
      !session.requires_signature
        ? "bg-[color-mix(in_srgb,#10b981_4%,var(--color-surface))]"
        : pending === 0
        ? "bg-[color-mix(in_srgb,#059669_4%,var(--color-surface))]"
        : "bg-[color-mix(in_srgb,var(--color-brand)_5%,var(--color-surface))]"
    }`}>
      <div className="shrink-0 mt-0.5">
        {!session.requires_signature ? (
          <CheckCircle2 size={18} strokeWidth={2.2} className="text-[#10b981]" />
        ) : pending === 0 ? (
          <CheckCircle2 size={18} strokeWidth={2.2} className="text-[#059669]" />
        ) : (
          <Clock size={18} strokeWidth={2.2} className="text-[var(--color-brand)]" />
        )}
      </div>
      <div className="flex-1 min-w-0 space-y-2">
        <p className={`text-[14px] font-semibold leading-snug ${
          !session.requires_signature ? "text-[#10b981]"
          : pending === 0 ? "text-[var(--color-foreground)]"
          : "text-[var(--color-brand)]"
        }`}>
          {!session.requires_signature
            ? "🟢 Activité en cours"
            : pending === 0
            ? "🟢 Activité en cours"
            : pending === 1
            ? "1 signature manquante"
            : `${pending} signatures manquantes`}
        </p>
        {!session.requires_signature ? (
          <p className="text-[13px] text-[var(--color-muted)]">
            {session.total === 0
              ? "Aucun participant pour le moment."
              : `${session.total} participant${session.total > 1 ? "s" : ""} enregistré${session.total > 1 ? "s" : ""}.`}
          </p>
        ) : pending === 0 ? (
          <p className="text-[13px] text-[var(--color-muted)]">
            Toutes les signatures ont été recueillies. La session restera ouverte jusqu&apos;à son heure de fin.
          </p>
        ) : (
          <LiveCountdown
            startTime={timeInfo.startTime}
            endTime={timeInfo.endTime}
            format="full"
            showIndicator={true}
          />
        )}
      </div>
    </div>
  ) : (
    <div className="flex items-start gap-3 rounded-xl bg-[color-mix(in_srgb,var(--color-brand)_4%,var(--color-surface))] p-4">
      <div className="shrink-0 mt-0.5">
        <Clock size={18} strokeWidth={2.2} className="text-[var(--color-brand)]" />
      </div>
      <div className="flex-1 min-w-0 space-y-2">
        <p className="text-[14px] font-medium leading-snug text-[var(--color-foreground)]">
          Activité à venir
        </p>
        <LiveCountdown
          startTime={timeInfo.startTime}
          endTime={timeInfo.endTime}
          format="full"
          showIndicator={true}
        />
      </div>
    </div>
  );

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-md animate-in zoom-in-95 duration-200">
        <div className="rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_65%,transparent)] bg-[var(--color-surface)] shadow-[0_24px_48px_-12px_rgba(0,0,0,0.25)] ring-1 ring-black/5 dark:ring-white/10">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-4">
            <div className="flex-1 min-w-0">
              <h2
                id="modal-title"
                className="text-[16px] font-bold leading-tight tracking-tight text-[var(--color-foreground)]"
              >
                {session.name}
              </h2>
            </div>
            <div className="flex items-center gap-1">
              <SessionActionsMenu
                sessionId={session.id}
                sessionName={session.name}
                isCompleted={variant === "upcoming"}
                variant="modal"
              />
              <button
                type="button"
                onClick={onClose}
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--color-muted)] transition-[background-color,color] ${motion} hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]`}
                aria-label="Fermer"
              >
                <X size={16} strokeWidth={2} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 pb-6 space-y-4">
            {/* Status */}
            {statusContent}

            {/* Date & horaires — lecture naturelle */}
            {timeInfo.startTime && (
              <div className="flex items-center gap-2 text-[13.5px] font-medium text-[var(--color-foreground)]">
                <span className="text-[15px]">📅</span>
                <span>
                  {formatSessionDate(timeInfo.startTime)}
                  {" · "}
                  {timeInfo.startTime.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  {timeInfo.endTime && (
                    <>
                      {" → "}
                      {timeInfo.endTime.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </>
                  )}
                  {timeInfo.durationMinutes && !timeInfo.endTime && (
                    <span className="ml-1.5 text-[12.5px] font-normal text-[var(--color-muted)]">
                      ({formatSessionDuration(timeInfo.durationMinutes)})
                    </span>
                  )}
                </span>
              </div>
            )}

            {/* Participants / Signatures */}
            <div>
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted)]/60">
                {session.requires_signature ? "Signatures" : "Participants"}
              </p>
              {session.total === 0 ? (
                <p className="text-[13px] text-[var(--color-muted)]">Aucun participant ajouté</p>
              ) : session.requires_signature ? (
                sigStateModal.isRepMode ? (
                  <p className="text-[14px] font-semibold text-[var(--color-foreground)]">
                    {sigStateModal.repSigned ? (
                      <span className="text-[var(--color-brand)]">✓ Représentant signé</span>
                    ) : (
                      <span className="text-[var(--color-muted)]">En attente du représentant</span>
                    )}
                    <span className="ml-2 text-[12px] font-normal text-[var(--color-muted)]">
                      · {session.total} participant{session.total > 1 ? "s" : ""} couverts
                    </span>
                  </p>
                ) : (
                  <>
                    <div className="flex items-baseline gap-2 mb-2 text-[14px]">
                      <span className="font-semibold tabular-nums text-[var(--color-foreground)]">
                        {sigStateModal.coveredSigned}
                      </span>
                      <span className="text-[var(--color-muted)]/40">/</span>
                      <span className="font-semibold tabular-nums text-[var(--color-foreground)]">
                        {session.total}
                      </span>
                      <span className="text-[13px] text-[var(--color-muted)]">
                        signature{session.total > 1 ? "s" : ""}
                      </span>
                    </div>
                    <GroupProgressBar
                      signed={sigStateModal.coveredSigned}
                      total={session.total}
                      variant="default"
                    />
                  </>
                )
              ) : (
                <div className="flex items-baseline gap-2 text-[14px]">
                  <span className="font-semibold tabular-nums text-[var(--color-foreground)]">
                    {session.total}
                  </span>
                  <span className="text-[13px] text-[var(--color-muted)]">
                    participant{session.total > 1 ? "s" : ""}
                  </span>
                </div>
              )}
            </div>

            {/* QR Code pour sessions en cours */}
            {variant === "ongoing" && pending > 0 && (
              <div>
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted)]/60">
                  QR Code
                </p>
                <div className="flex items-center justify-center rounded-xl bg-white p-4">
                  {loadingQr ? (
                    <div className="flex h-[200px] w-[200px] items-center justify-center">
                      <Loader2 size={32} strokeWidth={2} className="animate-spin text-gray-400" />
                    </div>
                  ) : qrDataUrl ? (
                    <div className="overflow-hidden rounded-lg">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={qrDataUrl} alt={`QR code — ${session.name}`} width={200} height={200} />
                    </div>
                  ) : null}
                </div>
                <p className="mt-2 text-center font-mono text-[11px] text-[var(--color-muted)]">
                  {appUrl}/g/{session.public_token}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 border-t border-[color-mix(in_srgb,var(--color-border)_40%,transparent)] px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className={`inline-flex h-9 items-center justify-center rounded-lg px-4 text-[13px] font-semibold tracking-tight text-[var(--color-foreground)]/80 transition-[background-color,color] ${motion} hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] active:scale-[0.98]`}
            >
              Fermer
            </button>
            <Link
              href={`/dashboard/groupes/${session.id}`}
              className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[color-mix(in_srgb,var(--color-border)_70%,transparent)] bg-[var(--color-surface)] px-3.5 text-[13px] font-semibold tracking-tight text-[var(--color-foreground)] shadow-sm transition-[background-color,transform,box-shadow,border-color] ${motion} hover:-translate-y-px hover:border-[color-mix(in_srgb,var(--color-border)_90%,var(--color-foreground))] hover:bg-[var(--color-surface-2)] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] active:translate-y-0 active:scale-[0.98]`}
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

// ─── Card ─────────────────────────────────────────────────────────────────────

type SessionCardProps = {
  session: DashboardGroupRow;
  variant?: "ongoing" | "upcoming" | "completed";
  appUrl: string;
};

export function SessionCard({ session, variant = "ongoing", appUrl }: SessionCardProps) {
  const [completedModalOpen, setCompletedModalOpen] = useState(false);
  const [quickViewOpen, setQuickViewOpen] = useState(false);

  const sigState = resolveGroupSigningState(session);
  const pending = sigState.total - sigState.coveredSigned;

  // Utiliser les nouveaux champs de temps
  const timeInfo = getSessionTimeInfo(
    session.start_time,
    session.end_time,
    session.duration_minutes
  );

  const now = Date.now();
  const endMs = timeInfo.endTime ? timeInfo.endTime.getTime() : null;
  const remainingMs = endMs ? Math.max(0, endMs - now) : null;
  const remainingMinutes = remainingMs ? remainingMs / 60000 : null;
  const isUrgent = remainingMinutes !== null && remainingMinutes > 0 && remainingMinutes <= 30 && pending > 0;

  // Styles selon le statut et variante
  const variantStyles = {
    ongoing: isUrgent
      ? "border-[color-mix(in_srgb,#dc2626_20%,var(--color-border))] bg-[color-mix(in_srgb,#dc2626_3%,var(--color-surface))] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_0_0_1px_color-mix(in_srgb,#dc2626_6%,transparent)]"
      : pending > 0
      ? "border-[color-mix(in_srgb,#10b981_25%,var(--color-border))] bg-[color-mix(in_srgb,#10b981_2%,var(--color-surface))] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_0_0_1px_color-mix(in_srgb,#10b981_6%,transparent)]"
      : "border-[color-mix(in_srgb,#10b981_20%,var(--color-border))] bg-[color-mix(in_srgb,#10b981_1.5%,var(--color-surface))] shadow-[0_1px_2px_rgba(0,0,0,0.03)]",
    upcoming: "border-[color-mix(in_srgb,var(--color-border)_40%,transparent)] bg-[var(--color-surface)] shadow-[0_1px_2px_rgba(0,0,0,0.03)]",
    completed: "border-[color-mix(in_srgb,var(--color-border)_25%,transparent)] bg-[color-mix(in_srgb,var(--color-muted)_1.5%,var(--color-surface))] shadow-[0_1px_1px_rgba(0,0,0,0.02)] opacity-60",
  };

  const cardContent = (
    <div className="space-y-2">
      {/* En-tête de carte avec nom + menu actions */}
      <div className="flex items-start justify-between gap-2">
        <h3 className={`flex-1 truncate font-semibold leading-tight tracking-tight ${
          variant === "completed"
            ? "text-[12.5px] text-[var(--color-foreground)]/70"
            : "text-[13.5px] text-[var(--color-foreground)]"
        }`}>
          {session.name}
        </h3>
        {variant !== "completed" && (
          <SessionActionsMenu
            sessionId={session.id}
            sessionName={session.name}
            isCompleted={false}
            variant="card"
          />
        )}
      </div>

      {/* État temporel & temps - Information principale */}
      {variant !== "completed" && timeInfo.startTime && (
        <div className="space-y-1">
          <LiveCountdown
            startTime={timeInfo.startTime}
            endTime={timeInfo.endTime}
            format="full"
            showIndicator={true}
          />
          {/* Afficher l'heure de fin si elle existe */}
          {timeInfo.endTime && (
            <div className="text-[10px] font-medium text-[var(--color-muted)]/70">
              Jusqu&apos;à {timeInfo.endTime.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
            </div>
          )}
        </div>
      )}

      {/* Compteur participants + barre de progression */}
      {variant !== "completed" && (
        <div className="space-y-1 pt-0.5">
          {session.total === 0 ? (
            <div className="text-[10px] font-medium text-[var(--color-muted)]">
              👥 Aucun participant
            </div>
          ) : session.requires_signature ? (
            sigState.isRepMode ? (
              <div className="text-[10px] font-medium text-[var(--color-muted)]">
                <span>✍</span>{" "}
                {sigState.repSigned ? (
                  <span className="font-semibold text-[var(--color-brand)]">Représentant signé ✓</span>
                ) : (
                  <span>En attente du représentant</span>
                )}
              </div>
            ) : (
              <>
                <div className="flex items-baseline gap-1.5 text-[10px] text-[var(--color-muted)]">
                  <span>✍</span>
                  <span className="font-semibold text-[var(--color-foreground)]">
                    {sigState.coveredSigned}
                  </span>
                  <span className="text-[var(--color-muted)]/40">/</span>
                  <span className="font-medium">
                    {session.total}
                  </span>
                  <span>
                    signature{session.total > 1 ? "s" : ""}
                  </span>
                </div>
                <GroupProgressBar
                  signed={sigState.coveredSigned}
                  total={session.total}
                  variant="default"
                />
              </>
            )
          ) : (
            <div className="flex items-baseline gap-1.5 text-[10px] text-[var(--color-muted)]">
              <span>👥</span>
              <span className="font-semibold text-[var(--color-foreground)]">
                {session.total}
              </span>
              <span>
                participant{session.total > 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Completed — fiche archive compacte */}
      {variant === "completed" && (() => {
        const startDate = session.start_time ? new Date(session.start_time) : null;
        const endDate = session.end_time ? new Date(session.end_time) : null;
        const computedEnd = endDate
          ? endDate
          : startDate && session.duration_minutes
            ? new Date(startDate.getTime() + session.duration_minutes * 60_000)
            : null;

        // Date naturelle
        const now = new Date();
        const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
        let dateLabel: string | null = null;
        if (startDate) {
          const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
          if (sameDay(startDate, now)) dateLabel = "Aujourd'hui";
          else if (sameDay(startDate, yesterday)) dateLabel = "Hier";
          else dateLabel = startDate.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
        }

        // Horaires
        const fmtT = (d: Date) => d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
        const timeRange = startDate && computedEnd
          ? `${fmtT(startDate)} → ${fmtT(computedEnd)}`
          : null;

        return (
          <div className="space-y-1.5">
            {/* Date + horaires */}
            {(dateLabel || timeRange) && (
              <p className="text-[11px] text-[var(--color-muted)]">
                {dateLabel && <span className="font-medium">{dateLabel}</span>}
                {dateLabel && timeRange && <span className="mx-1 opacity-30">·</span>}
                {timeRange && <span className="tabular-nums">{timeRange}</span>}
              </p>
            )}
            {/* Participants + signatures */}
            <div className="flex items-center gap-2 text-[11px] text-[var(--color-muted)]">
              <span>
                <span className="font-semibold tabular-nums text-[var(--color-foreground)]/60">
                  {session.total}
                </span>{" "}
                participant{session.total !== 1 ? "s" : ""}
              </span>
              {session.requires_signature && session.total > 0 && (() => {
                const cs = resolveGroupSigningState(session);
                return (
                  <>
                    <span className="opacity-30">·</span>
                    {cs.isRepMode ? (
                      <span className={cs.repSigned ? "text-[#059669] font-semibold" : ""}>
                        {cs.repSigned ? "Représentant ✓" : "En attente rep."}
                      </span>
                    ) : (
                      <span className={cs.allCovered ? "text-[#059669] font-semibold" : ""}>
                        {cs.coveredSigned}/{session.total} sig.
                      </span>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        );
      })()}
    </div>
  );

  if (variant === "completed") {
    return (
      <>
        <div
          role="button"
          tabIndex={0}
          onClick={() => setCompletedModalOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setCompletedModalOpen(true);
            }
          }}
          className={`group block w-full text-left rounded-[10px] border px-2.5 py-1.5 transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.1)] hover:border-[color-mix(in_srgb,var(--color-border)_60%,transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] cursor-pointer ${variantStyles[variant]}`}
        >
          {cardContent}
        </div>
        <CompletedSessionModal
          session={{
            id: session.id,
            name: session.name,
            template_title: session.template_title,
            status: session.status,
            total: session.total,
            signed: session.signed,
            end_time: session.end_time,
            start_time: session.start_time,
            scheduled_at: session.scheduled_at,
            duration_minutes: session.duration_minutes,
            requires_signature: session.requires_signature,
            signature_mode: session.signature_mode,
            rep_signed: session.rep_signed,
          }}
          open={completedModalOpen}
          onClose={() => setCompletedModalOpen(false)}
        />
      </>
    );
  }

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setQuickViewOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setQuickViewOpen(true);
          }
        }}
        className={`group block w-full text-left rounded-[10px] border px-2.5 py-2 transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(0,0,0,0.12)] hover:border-[color-mix(in_srgb,var(--color-border)_80%,var(--color-foreground))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] cursor-pointer ${variantStyles[variant]}`}
      >
        {cardContent}
      </div>
      <SessionQuickViewModal
        session={session}
        variant={variant}
        appUrl={appUrl}
        open={quickViewOpen}
        onClose={() => setQuickViewOpen(false)}
      />
    </>
  );
}

export function DashboardSessionsView({
  groups,
  appUrl,
}: {
  groups: DashboardGroupRow[];
  appUrl: string;
}) {
  const [showAllCompleted, setShowAllCompleted] = useState(false);
  const [upcomingExpanded, setUpcomingExpanded] = useState(false);
  const [activityExpanded, setActivityExpanded] = useState(false);

  return (
    <LiveSessionManager groups={groups}>
      {(classified) => {
        const { ongoing, todayUpcoming, upcoming, completed } = classified;

        const upcomingSessions = upcoming.slice(0, 6);
        const completedToShow = showAllCompleted ? completed : completed.slice(0, 4);
        const remainingCompleted = completed.length - 4;

        return (
          <div className="flex flex-col gap-6">
            {/* 1. EN COURS — Sessions actives maintenant */}
            {ongoing.length > 0 && (
              <section>
                <div className="mb-3 flex items-center gap-2">
                  <h2 className="text-[13px] font-semibold tracking-tight text-[var(--color-foreground)]">
                    En cours
                  </h2>
                  <span className="text-[11px] font-medium tabular-nums text-[var(--color-muted)]/50">
                    {ongoing.length}
                  </span>
                </div>

                <AnimatedSessionGrid layoutId="ongoing">
                  {ongoing.map(session => (
                    <AnimatedSessionCard key={session.id} sessionId={session.id}>
                      <SessionCard
                        session={session}
                        variant="ongoing"
                        appUrl={appUrl}
                      />
                    </AnimatedSessionCard>
                  ))}
                </AnimatedSessionGrid>
              </section>
            )}

            {/* 2. AUJOURD'HUI — À venir aujourd'hui */}
            {todayUpcoming.length > 0 && (
              <section>
                <div className="mb-3 flex items-center gap-2">
                  <h2 className="text-[13px] font-semibold tracking-tight text-[var(--color-foreground)]">
                    Aujourd&apos;hui
                  </h2>
                  <span className="text-[11px] font-medium tabular-nums text-[var(--color-muted)]/50">
                    {todayUpcoming.length}
                  </span>
                </div>

                <AnimatedSessionGrid layoutId="today">
                  {todayUpcoming.map(session => (
                    <AnimatedSessionCard key={session.id} sessionId={session.id}>
                      <SessionCard
                        session={session}
                        variant="upcoming"
                        appUrl={appUrl}
                      />
                    </AnimatedSessionCard>
                  ))}
                </AnimatedSessionGrid>
              </section>
            )}

            {/* 3. DEMAIN ET APRÈS — Collapsible */}
            {upcomingSessions.length > 0 && (
              <section>
                <button
                  type="button"
                  onClick={() => setUpcomingExpanded(!upcomingExpanded)}
                  className="mb-3 flex w-full items-center gap-2 text-left transition-colors hover:text-[var(--color-foreground)]"
                >
                  <ChevronRight
                    size={14}
                    strokeWidth={2}
                    className={`text-[var(--color-muted)] transition-transform ${upcomingExpanded ? 'rotate-90' : ''}`}
                  />
                  <h2 className="text-[13px] font-semibold tracking-tight text-[var(--color-foreground)]/80">
                    Demain et après
                  </h2>
                  <span className="text-[11px] font-medium tabular-nums text-[var(--color-muted)]/40">
                    {upcomingSessions.length}
                  </span>
                </button>

                {upcomingExpanded && (
                  <AnimatedSessionGrid layoutId="upcoming">
                    {upcomingSessions.map(session => (
                      <AnimatedSessionCard key={session.id} sessionId={session.id}>
                        <SessionCard
                          session={session}
                          variant="upcoming"
                          appUrl={appUrl}
                        />
                      </AnimatedSessionCard>
                    ))}
                  </AnimatedSessionGrid>
                )}
              </section>
            )}

            {/* 4. ACTIVITÉ RÉCENTE — Collapsible */}
            {completed.length > 0 && (
              <section className="pt-5 mt-1 border-t border-[color-mix(in_srgb,var(--color-border)_25%,transparent)]">
                <button
                  type="button"
                  onClick={() => setActivityExpanded(!activityExpanded)}
                  className="mb-3 flex w-full items-center gap-2 text-left transition-colors hover:text-[var(--color-foreground)]"
                >
                  <ChevronRight
                    size={14}
                    strokeWidth={2}
                    className={`text-[var(--color-muted)] transition-transform ${activityExpanded ? 'rotate-90' : ''}`}
                  />
                  <h2 className="text-[13px] font-semibold tracking-tight text-[var(--color-foreground)]/70">
                    Activité récente
                  </h2>
                  <span className="text-[11px] font-medium tabular-nums text-[var(--color-muted)]/40">
                    {completed.length}
                  </span>
                </button>

                {activityExpanded && (
                  <>
                    <AnimatedSessionGrid layoutId="completed">
                      {completedToShow.map(session => (
                        <AnimatedSessionCard key={session.id} sessionId={session.id}>
                          <SessionCard
                            session={session}
                            variant="completed"
                            appUrl={appUrl}
                          />
                        </AnimatedSessionCard>
                      ))}
                    </AnimatedSessionGrid>

                    {/* Lien pour afficher toutes les sessions */}
                    {remainingCompleted > 0 && !showAllCompleted && (
                      <div className="mt-3 flex justify-center">
                        <button
                          type="button"
                          onClick={() => setShowAllCompleted(true)}
                          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium text-[var(--color-muted)] transition-colors duration-150 hover:text-[var(--color-foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]"
                        >
                          Voir les {remainingCompleted} autre{remainingCompleted > 1 ? 's' : ''}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </section>
            )}

            {/* État vide */}
            {ongoing.length === 0 && todayUpcoming.length === 0 && upcomingSessions.length === 0 && completed.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--color-muted)_8%,transparent)]">
                  <Calendar size={24} strokeWidth={1.8} className="text-[var(--color-muted)]" />
                </div>
                <p className="text-[14.5px] font-semibold tracking-tight text-[var(--color-foreground)]">
                  Aucune activité
                </p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--color-muted)]">
                  Créez une nouvelle activité pour commencer
                </p>
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent('open-new-session-modal'))}
                  className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-xl bg-[var(--color-brand)] px-4 text-[13px] font-semibold text-[var(--color-on-brand)] shadow-[0_1px_0_rgba(255,255,255,0.1)_inset,var(--elev-1)] transition-[transform,filter,box-shadow] duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px hover:brightness-[1.03] hover:shadow-[0_1px_0_rgba(255,255,255,0.14)_inset,var(--elev-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:translate-y-0 active:scale-[0.98]"
                >
                  <Plus size={15} strokeWidth={2.2} aria-hidden />
                  Nouvelle activité
                </button>
              </div>
            )}
          </div>
        );
      }}
    </LiveSessionManager>
  );
}
