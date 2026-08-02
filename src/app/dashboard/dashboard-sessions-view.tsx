"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Calendar, Clock, CheckCircle2, AlertCircle, AlertTriangle, Plus, Loader2, X, ArrowRight, ChevronRight } from "lucide-react";
import type { DashboardGroupRow } from "@/lib/dashboard/types";
import { GroupProgressBar } from "@/components/groups/group-progress";
import {
  getSessionTimeInfo,
  formatSessionDuration,
  formatSessionDate,
  formatTimeRange,
  getTimeUntilText
} from "@/lib/session-time";
import { CompletedSessionModal } from "./completed-session-modal";

/**
 * PAOVA V2 - Sessions View
 */

// ─── Live Time Display Component ─────────────────────────────────────────────

type LiveTimeRemainingProps = {
  endTime: Date;
  startTime: Date;
  variant: "ongoing" | "upcoming";
};

function LiveTimeRemaining({ endTime, startTime, variant }: LiveTimeRemainingProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const remainingMs = Math.max(0, endTime.getTime() - now);
  const timeUntilStartMs = Math.max(0, startTime.getTime() - now);

  // Si la session n'a pas encore commencé
  if (variant === "upcoming" || timeUntilStartMs > 0) {
    const minutes = Math.floor(timeUntilStartMs / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const isToday = startTime.getDate() === today.getDate() &&
                    startTime.getMonth() === today.getMonth() &&
                    startTime.getFullYear() === today.getFullYear();

    const isTomorrow = startTime.getDate() === tomorrow.getDate() &&
                       startTime.getMonth() === tomorrow.getMonth() &&
                       startTime.getFullYear() === tomorrow.getFullYear();

    let prefix = "";
    let timeText = "";

    if (isToday) {
      prefix = "Aujourd'hui";
      if (minutes < 60) {
        timeText = `Commence dans ${minutes} min`;
      } else {
        const formattedTime = startTime.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
        timeText = `Commence à ${formattedTime}`;
      }
    } else if (isTomorrow) {
      prefix = "Demain";
      const formattedTime = startTime.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
      timeText = `à ${formattedTime}`;
    } else if (days > 0) {
      const dayName = startTime.toLocaleDateString("fr-FR", { weekday: "long" });
      const formattedTime = startTime.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
      prefix = dayName.charAt(0).toUpperCase() + dayName.slice(1);
      timeText = `à ${formattedTime}`;
    } else {
      if (hours > 0) {
        timeText = `Commence dans ${hours} h ${minutes % 60} min`;
      } else {
        timeText = `Commence dans ${minutes} min`;
      }
    }

    return (
      <div className="flex flex-col gap-0.5">
        {prefix && (
          <div className="text-[11px] font-medium text-[var(--color-muted)]">
            {prefix}
          </div>
        )}
        <div className="text-[11.5px] font-medium text-[var(--color-foreground)]">
          {timeText}
        </div>
      </div>
    );
  }

  // Session terminée
  if (remainingMs === 0) {
    return null;
  }

  const totalSeconds = Math.floor(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const hours = Math.floor(minutes / 60);
  const isUrgent = minutes < 10;

  let text = "";
  if (hours > 0) {
    text = `${hours} h ${String(minutes % 60).padStart(2, "0")}`;
  } else if (minutes > 0) {
    text = `${minutes} min`;
  } else {
    text = `${totalSeconds} sec`;
  }

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1.5">
        <div className={`h-1.5 w-1.5 rounded-full ${isUrgent ? "bg-[#ef4444]" : "bg-[#10b981]"}`} />
        <span className="text-[11px] font-medium text-[var(--color-muted)]">
          En cours
        </span>
      </div>
      <div className={`text-[11.5px] font-semibold tabular-nums ${
        isUrgent ? "text-[#ef4444]" : "text-[var(--color-foreground)]"
      }`}>
        Se termine dans {text}
      </div>
    </div>
  );
}

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

function SessionQuickViewModal({ session, variant, appUrl, open, onClose }: SessionQuickViewProps) {
  const [mounted, setMounted] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loadingQr, setLoadingQr] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Update time every second when modal is open
  useEffect(() => {
    if (!open) return;
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [open]);

  const pending = session.total - session.signed;
  const timeInfo = getSessionTimeInfo(session.start_time, session.end_time, session.duration_minutes);

  // Déterminer l'urgence (basé sur now en temps réel)
  const endMs = timeInfo.endTime ? timeInfo.endTime.getTime() : null;
  const remainingMs = endMs ? Math.max(0, endMs - now) : null;
  const remainingMinutes = remainingMs ? remainingMs / 60000 : null;
  const isUrgent = remainingMinutes !== null && remainingMinutes > 0 && remainingMinutes <= 30 && pending > 0;
  const isCompleting = remainingMinutes !== null && remainingMinutes > 30 && remainingMinutes <= 120 && pending > 0;

  // Temps restant pour affichage temps réel
  const timeUntilEnd = endMs ? endMs - now : null;
  const timeUntilStart = timeInfo.startTime ? timeInfo.startTime.getTime() - now : null;

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
    pending > 0 ? (
      <div className={`flex items-start gap-3 rounded-xl p-4 ${
        isUrgent
          ? "bg-[color-mix(in_srgb,#dc2626_6%,var(--color-surface))]"
          : isCompleting
          ? "bg-[color-mix(in_srgb,#d97706_5%,var(--color-surface))]"
          : "bg-[color-mix(in_srgb,var(--color-brand)_5%,var(--color-surface))]"
      }`}>
        <div className="shrink-0 mt-0.5">
          {isUrgent ? (
            <AlertCircle size={18} strokeWidth={2.2} className="text-[#dc2626]" />
          ) : isCompleting ? (
            <AlertTriangle size={18} strokeWidth={2.2} className="text-[#d97706]" />
          ) : (
            <Clock size={18} strokeWidth={2.2} className="text-[var(--color-brand)]" />
          )}
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <p className={`text-[14px] font-medium leading-snug ${
            isUrgent ? "text-[#dc2626]" : isCompleting ? "text-[#d97706]" : "text-[var(--color-brand)]"
          }`}>
            {pending === 1 ? "1 signature manquante" : `${pending} signatures manquantes`}
          </p>
          {timeUntilEnd && timeUntilEnd > 0 && (() => {
            const totalSeconds = Math.floor(timeUntilEnd / 1000);
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            return (
              <p className={`text-[13px] font-medium tabular-nums ${
                minutes < 10 ? "text-[#dc2626]" : "text-[var(--color-muted)]"
              }`}>
                {minutes > 0 ? (
                  <>Temps restant : {minutes} min</>
                ) : (
                  <>Temps restant : {seconds} sec</>
                )}
              </p>
            );
          })()}
        </div>
      </div>
    ) : (
      <div className="flex items-start gap-3 rounded-xl bg-[color-mix(in_srgb,#059669_4%,var(--color-surface))] p-4">
        <div className="shrink-0 mt-0.5">
          <CheckCircle2 size={18} strokeWidth={2.2} className="text-[#059669]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-medium leading-snug text-[var(--color-foreground)]">
            Toutes les signatures sont recueillies
          </p>
          <p className="mt-1 text-[13px] text-[var(--color-muted)]">
            La session est prête
          </p>
        </div>
      </div>
    )
  ) : (
    <div className="flex items-start gap-3 rounded-xl bg-[color-mix(in_srgb,var(--color-brand)_4%,var(--color-surface))] p-4">
      <div className="shrink-0 mt-0.5">
        <Clock size={18} strokeWidth={2.2} className="text-[var(--color-brand)]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-medium leading-snug text-[var(--color-foreground)]">
          Session à venir
        </p>
        {timeUntilStart && timeUntilStart > 0 && (
          <p className="mt-1 text-[13px] text-[var(--color-muted)]">
            Débute {getTimeUntilText(timeUntilStart)}
          </p>
        )}
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
              <p className="mt-1 text-[12.5px] text-[var(--color-muted)]">
                {session.template_title}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--color-muted)] transition-[background-color,color] ${motion} hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]`}
              aria-label="Fermer"
            >
              <X size={16} strokeWidth={2} />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 pb-6 space-y-4">
            {/* Status */}
            {statusContent}

            {/* Horaires */}
            {(timeInfo.startTime || timeInfo.endTime) && (
              <div>
                <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted)]/60">
                  Horaires
                </p>
                <div className="space-y-1">
                  {timeInfo.startTime && (
                    <p className="text-[13px] text-[var(--color-foreground)]">
                      <span className="text-[var(--color-muted)]">Début :</span>{" "}
                      {formatSessionDate(timeInfo.startTime)} · {timeInfo.endTime ? formatTimeRange(timeInfo.startTime, timeInfo.endTime).split(" - ")[0] : timeInfo.startTime.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  )}
                  {timeInfo.endTime && (
                    <p className="text-[13px] text-[var(--color-foreground)]">
                      <span className="text-[var(--color-muted)]">Fin :</span>{" "}
                      {timeInfo.endTime.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      {timeInfo.durationMinutes && (
                        <span className="text-[var(--color-muted)]"> · {formatSessionDuration(timeInfo.durationMinutes)}</span>
                      )}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Progression */}
            <div>
              <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted)]/60">
                Progression
              </p>
              <div className="flex items-baseline gap-2 mb-2 text-[14px]">
                <span className="font-semibold tabular-nums text-[var(--color-foreground)]">
                  {session.signed}
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
                signed={session.signed}
                total={session.total}
                variant="default"
              />
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
              Voir la session
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

function SessionCard({ session, variant = "ongoing", appUrl }: SessionCardProps) {
  const [completedModalOpen, setCompletedModalOpen] = useState(false);
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const pending = session.total - session.signed;

  // Utiliser les nouveaux champs de temps
  const timeInfo = getSessionTimeInfo(
    session.start_time,
    session.end_time,
    session.duration_minutes
  );

  // Déterminer l'urgence
  const now = Date.now();
  const endMs = timeInfo.endTime ? timeInfo.endTime.getTime() : null;
  const remainingMs = endMs ? Math.max(0, endMs - now) : null;
  const remainingMinutes = remainingMs ? remainingMs / 60000 : null;
  const isUrgent = remainingMinutes !== null && remainingMinutes > 0 && remainingMinutes <= 30 && pending > 0;

  // Styles selon le statut et variante
  const variantStyles = {
    ongoing: isUrgent
      ? "border-[color-mix(in_srgb,#dc2626_25%,var(--color-border))] bg-[color-mix(in_srgb,#dc2626_4%,var(--color-surface))]"
      : pending > 0
      ? "border-[color-mix(in_srgb,var(--color-brand)_20%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-brand)_3%,var(--color-surface))]"
      : "border-[color-mix(in_srgb,var(--color-brand)_15%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-brand)_2%,var(--color-surface))]",
    upcoming: "border-[color-mix(in_srgb,var(--color-border)_45%,transparent)] bg-[var(--color-surface)]",
    completed: "border-[color-mix(in_srgb,#059669_15%,var(--color-border))] bg-[color-mix(in_srgb,#059669_2%,var(--color-surface))] opacity-70",
  };

  const cardContent = (
    <>
      {/* Nom de la session */}
      <h3 className={`truncate font-semibold leading-tight tracking-tight ${
        variant === "completed"
          ? "text-[13px] text-[var(--color-foreground)]/90"
          : "text-[13.5px] text-[var(--color-foreground)]"
      }`}>
        {session.name}
      </h3>

      {/* Informations temporelles - priorité absolue */}
      {variant !== "completed" && timeInfo.startTime && timeInfo.endTime && (
        <div className="mt-1.5">
          <LiveTimeRemaining
            startTime={timeInfo.startTime}
            endTime={timeInfo.endTime}
            variant={variant}
          />
        </div>
      )}

      {/* Progression */}
      {variant !== "completed" && (
        <div className="mt-2">
          <div className="mb-1 flex items-baseline gap-1 text-[11px]">
            <span className="font-semibold tabular-nums text-[var(--color-foreground)]">
              {session.signed}
            </span>
            <span className="text-[var(--color-muted)]/40">/</span>
            <span className="font-semibold tabular-nums text-[var(--color-foreground)]">
              {session.total}
            </span>
            <span className="text-[var(--color-muted)]/70">
              signature{session.total > 1 ? "s" : ""}
            </span>
          </div>
          <GroupProgressBar
            signed={session.signed}
            total={session.total}
            variant="default"
          />
        </div>
      )}

      {/* Completed sessions - minimal info */}
      {variant === "completed" && (
        <div className="mt-1.5 flex items-center gap-1.5">
          <CheckCircle2 size={11} strokeWidth={2.2} className="text-[#059669]" />
          <span className="text-[10.5px] text-[var(--color-muted)]">
            {session.signed >= session.total && session.total > 0
              ? `${session.signed} signature${session.signed > 1 ? 's' : ''}`
              : "Fermée"}
          </span>
        </div>
      )}
    </>
  );

  if (variant === "completed") {
    return (
      <>
        <button
          type="button"
          onClick={() => setCompletedModalOpen(true)}
          className={`group block w-full text-left rounded-lg border p-2 shadow-sm transition-[transform,box-shadow,border-color] duration-[140ms] hover:-translate-y-0.5 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] ${variantStyles[variant]}`}
        >
          {cardContent}
        </button>
        <CompletedSessionModal
          session={{
            id: session.id,
            name: session.name,
            template_title: session.template_title,
            status: session.status,
            total: session.total,
            signed: session.signed,
            end_time: session.end_time,
          }}
          open={completedModalOpen}
          onClose={() => setCompletedModalOpen(false)}
        />
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setQuickViewOpen(true)}
        className={`group block w-full text-left rounded-lg border p-2.5 shadow-sm transition-[transform,box-shadow,border-color] duration-[140ms] hover:-translate-y-0.5 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] ${variantStyles[variant]}`}
      >
        {cardContent}
      </button>
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
  const now = new Date();
  const [showAllCompleted, setShowAllCompleted] = useState(false);
  const [upcomingExpanded, setUpcomingExpanded] = useState(false);
  const [activityExpanded, setActivityExpanded] = useState(false);

  // Définir les limites de "aujourd'hui" en heure locale
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  // Définir "demain"
  const tomorrowEnd = new Date(todayEnd);
  tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);

  // Classifier les sessions en utilisant les champs temporels V2.
  // Priorité : start_time (V2) > scheduled_at (V1 legacy)

  /** Retourne true si la session est en cours maintenant. */
  function isSessionOngoing(g: DashboardGroupRow): boolean {
    if (g.status !== "open") return false;
    const timeInfo = getSessionTimeInfo(g.start_time, g.end_time, g.duration_minutes);
    // En cours = a commencé ET (pas de fin OU pas encore finie)
    return timeInfo.isOngoing || !!(timeInfo.startTime && timeInfo.startTime <= now && !timeInfo.isPast);
  }

  /** Retourne true si la session est prévue aujourd'hui mais pas encore commencée. */
  function isSessionTodayUpcoming(g: DashboardGroupRow): boolean {
    if (g.status !== "open") return false;
    const timeRef = g.start_time ?? g.scheduled_at;
    if (!timeRef) return false;
    const t = new Date(timeRef);
    // La session est aujourd'hui ET dans le futur
    return t >= todayStart && t < todayEnd && t > now;
  }

  /** Retourne true si la session est à venir (demain et après). */
  function isSessionUpcoming(g: DashboardGroupRow): boolean {
    if (g.status !== "open") return false;
    const timeRef = g.start_time ?? g.scheduled_at;
    if (!timeRef) return false;
    const t = new Date(timeRef);
    // La session est après aujourd'hui
    return t >= todayEnd;
  }

  /** Retourne true si la session est terminée (tous signés, fermée, ou end_time dépassé). */
  function isSessionCompleted(g: DashboardGroupRow): boolean {
    if (g.status === "archived") return false;
    if (g.status === "closed") return true;
    if (g.signed >= g.total && g.total > 0) return true;
    if (g.end_time && new Date(g.end_time) < now) return true;
    return false;
  }

  // 1. Sessions EN COURS (commencées, pas terminées)
  const ongoingSessions = groups
    .filter(g => isSessionOngoing(g) && !isSessionCompleted(g))
    .sort((a, b) => {
      // Trier par urgence/temps restant
      const aTimeInfo = getSessionTimeInfo(a.start_time, a.end_time, a.duration_minutes);
      const bTimeInfo = getSessionTimeInfo(b.start_time, b.end_time, b.duration_minutes);

      const aEndMs = aTimeInfo.endTime ? aTimeInfo.endTime.getTime() : Infinity;
      const bEndMs = bTimeInfo.endTime ? bTimeInfo.endTime.getTime() : Infinity;

      const aRemaining = Math.max(0, aEndMs - now.getTime());
      const bRemaining = Math.max(0, bEndMs - now.getTime());

      if (aRemaining !== bRemaining) return aRemaining - bRemaining;

      // Si même urgence, trier par signatures manquantes
      const aPending = a.total - a.signed;
      const bPending = b.total - b.signed;
      return bPending - aPending;
    });

  // 2. Sessions À VENIR AUJOURD'HUI (pas encore commencées)
  const todayUpcoming = groups
    .filter(g => isSessionTodayUpcoming(g) && !isSessionCompleted(g))
    .sort((a, b) => {
      const aTime = a.start_time ?? a.scheduled_at ?? "";
      const bTime = b.start_time ?? b.scheduled_at ?? "";
      return aTime.localeCompare(bTime);
    });

  // 3. Sessions DEMAIN ET APRÈS
  const upcomingSessions = groups
    .filter(isSessionUpcoming)
    .sort((a, b) => {
      const aTime = a.start_time ?? a.scheduled_at ?? "";
      const bTime = b.start_time ?? b.scheduled_at ?? "";
      return aTime.localeCompare(bTime);
    })
    .slice(0, 6);

  // 4. Sessions TERMINÉES AUJOURD'HUI
  const completedSessions = groups.filter(isSessionCompleted);
  const completedToShow = showAllCompleted ? completedSessions : completedSessions.slice(0, 4);
  const remainingCompleted = completedSessions.length - 4;

  return (
    <div className="flex flex-col gap-5">
      {/* 1. EN COURS — Sessions actives maintenant */}
      {ongoingSessions.length > 0 && (
        <section>
          <div className="mb-2.5 flex items-center gap-2">
            <h2 className="text-[13px] font-semibold tracking-tight text-[var(--color-foreground)]">
              En cours
            </h2>
            <span className="text-[11px] font-medium tabular-nums text-[var(--color-muted)]/60">
              {ongoingSessions.length}
            </span>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {ongoingSessions.map(session => (
              <SessionCard
                key={session.id}
                session={session}
                variant="ongoing"
                appUrl={appUrl}
              />
            ))}
          </div>
        </section>
      )}

      {/* 2. AUJOURD'HUI — À venir aujourd'hui */}
      {todayUpcoming.length > 0 && (
        <section>
          <div className="mb-2.5 flex items-center gap-2">
            <h2 className="text-[13px] font-semibold tracking-tight text-[var(--color-foreground)]">
              Aujourd&apos;hui
            </h2>
            <span className="text-[11px] font-medium tabular-nums text-[var(--color-muted)]/60">
              {todayUpcoming.length}
            </span>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {todayUpcoming.map(session => (
              <SessionCard
                key={session.id}
                session={session}
                variant="upcoming"
                appUrl={appUrl}
              />
            ))}
          </div>
        </section>
      )}

      {/* 3. DEMAIN ET APRÈS — Collapsible */}
      {upcomingSessions.length > 0 && (
        <section>
          <button
            type="button"
            onClick={() => setUpcomingExpanded(!upcomingExpanded)}
            className="mb-2.5 flex w-full items-center gap-2 text-left transition-colors hover:text-[var(--color-foreground)]"
          >
            <ChevronRight
              size={14}
              strokeWidth={2}
              className={`text-[var(--color-muted)] transition-transform ${upcomingExpanded ? 'rotate-90' : ''}`}
            />
            <h2 className="text-[13px] font-semibold tracking-tight text-[var(--color-foreground)]/80">
              Demain et après
            </h2>
            <span className="text-[11px] font-medium tabular-nums text-[var(--color-muted)]/50">
              {upcomingSessions.length}
            </span>
          </button>

          {upcomingExpanded && (
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {upcomingSessions.map(session => (
                <SessionCard
                  key={session.id}
                  session={session}
                  variant="upcoming"
                  appUrl={appUrl}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* 4. ACTIVITÉ RÉCENTE — Collapsible */}
      {completedSessions.length > 0 && (
        <section className="pt-4 mt-4 border-t border-[color-mix(in_srgb,var(--color-border)_30%,transparent)]">
          <button
            type="button"
            onClick={() => setActivityExpanded(!activityExpanded)}
            className="mb-2.5 flex w-full items-center gap-2 text-left transition-colors hover:text-[var(--color-foreground)]"
          >
            <ChevronRight
              size={14}
              strokeWidth={2}
              className={`text-[var(--color-muted)] transition-transform ${activityExpanded ? 'rotate-90' : ''}`}
            />
            <h2 className="text-[13px] font-semibold tracking-tight text-[var(--color-foreground)]/80">
              Activité récente
            </h2>
            <span className="text-[11px] font-medium tabular-nums text-[var(--color-muted)]/50">
              {completedSessions.length}
            </span>
          </button>

          {activityExpanded && (
            <>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {completedToShow.map(session => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    variant="completed"
                    appUrl={appUrl}
                  />
                ))}
              </div>

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
      {ongoingSessions.length === 0 && todayUpcoming.length === 0 && upcomingSessions.length === 0 && completedSessions.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--color-muted)_8%,transparent)]">
            <Calendar size={24} strokeWidth={1.8} className="text-[var(--color-muted)]" />
          </div>
          <p className="text-[14.5px] font-semibold tracking-tight text-[var(--color-foreground)]">
            Aucune session
          </p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--color-muted)]">
            Créez une nouvelle session pour commencer
          </p>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('open-new-session-modal'))}
            className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-xl bg-[var(--color-brand)] px-4 text-[13px] font-semibold text-[var(--color-on-brand)] shadow-[0_1px_0_rgba(255,255,255,0.1)_inset,var(--elev-1)] transition-[transform,filter,box-shadow] duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px hover:brightness-[1.03] hover:shadow-[0_1px_0_rgba(255,255,255,0.14)_inset,var(--elev-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:translate-y-0 active:scale-[0.98]"
          >
            <Plus size={15} strokeWidth={2.2} aria-hidden />
            Nouvelle session
          </button>
        </div>
      )}
    </div>
  );
}
