"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Calendar, Clock, Users, CheckCircle2, CalendarClock, AlertCircle, AlertTriangle, Plus, QrCode, Loader2, X } from "lucide-react";
import type { DashboardGroupRow } from "@/lib/dashboard/types";
import { GroupProgressBar } from "@/components/groups/group-progress";
import {
  getSessionTimeInfo,
  formatSessionDuration,
  formatSessionDate,
  formatTimeRange,
  getTimeUntilText
} from "@/lib/session-time";

/**
 * PAOVA V2 - Sessions View
 */

// ─── QR inline depuis la card ────────────────────────────────────────────────

function CardQrButton({ publicUrl, sessionName }: { publicUrl: string; sessionName: string }) {
  const [open, setOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    setMounted(true);
  }, []);

  async function handleOpen(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();

    // Ouvrir le modal immédiatement
    setOpen(true);

    // Charger le QR en arrière-plan si pas encore chargé
    if (!qrDataUrl) {
      setLoading(true);
      try {
        const QRCode = (await import("qrcode")).default;
        const url = await QRCode.toDataURL(publicUrl, {
          width: 280,
          margin: 1,
          color: { dark: "#0a0a0a", light: "#ffffff" },
        });
        setQrDataUrl(url);
      } finally {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const modalContent = open && mounted ? (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`QR code — ${sessionName}`}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.target === e.currentTarget) close();
      }}
      style={{ background: "rgba(0, 0, 0, 0.9)", backdropFilter: "blur(4px)" }}
    >
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          close();
        }}
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        aria-label="Fermer"
      >
        <X size={20} aria-hidden />
      </button>
      <div
        className="flex flex-col items-center gap-5 rounded-2xl bg-white p-6 shadow-2xl sm:p-8"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <p className="max-w-[240px] text-center text-[14px] font-semibold tracking-tight text-gray-900">
          {sessionName}
        </p>
        {loading ? (
          <div className="flex h-[280px] w-[280px] items-center justify-center">
            <Loader2 size={32} strokeWidth={2} className="animate-spin text-gray-400" />
          </div>
        ) : qrDataUrl ? (
          <div className="overflow-hidden rounded-xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt={`QR code — ${sessionName}`} width={280} height={280} />
          </div>
        ) : null}
        <p className="max-w-[240px] truncate text-center font-mono text-[12px] text-gray-400">
          {publicUrl}
        </p>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        aria-label="Afficher le QR code"
        className="flex shrink-0 items-center gap-1 rounded-lg border border-[color-mix(in_srgb,var(--color-border)_65%,transparent)] bg-[var(--color-surface)] px-2 py-1 text-[11px] font-semibold text-[var(--color-foreground)]/70 shadow-[var(--elev-1)] transition-[background-color,border-color,transform] duration-140 hover:border-[color-mix(in_srgb,var(--color-brand)_28%,var(--color-border))] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)] active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-brand)]"
      >
        <QrCode size={11} strokeWidth={2} aria-hidden />
        QR
      </button>

      {mounted ? createPortal(modalContent, document.body) : null}
    </>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

type SessionCardProps = {
  session: DashboardGroupRow;
  variant?: "ongoing" | "upcoming" | "completed";
  appUrl?: string;
};

function SessionCard({ session, variant = "ongoing", appUrl }: SessionCardProps) {
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
  const isCompleting = remainingMinutes !== null && remainingMinutes > 30 && remainingMinutes <= 120 && pending > 0;

  // Styles selon le statut et variante
  const variantStyles = {
    ongoing: isUrgent
      ? "border-[color-mix(in_srgb,#dc2626_32%,var(--color-border))] bg-[color-mix(in_srgb,#dc2626_6%,var(--color-surface))]"
      : isCompleting
      ? "border-[color-mix(in_srgb,#d97706_28%,var(--color-border))] bg-[color-mix(in_srgb,#d97706_5%,var(--color-surface))]"
      : pending > 0
      ? "border-[color-mix(in_srgb,var(--color-brand)_25%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-brand)_5%,var(--color-surface))]"
      : "border-[color-mix(in_srgb,var(--color-brand)_20%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-brand)_3.5%,var(--color-surface))]",
    upcoming: "border-[color-mix(in_srgb,var(--color-border)_55%,transparent)] bg-[var(--color-surface)]",
    completed: "border-[color-mix(in_srgb,var(--color-border)_40%,transparent)] bg-[var(--color-surface)] opacity-45",
  };

  const cardPadding = variant === "completed" ? "p-2" : variant === "upcoming" ? "p-2.5" : "p-3";

  return (
    <Link
      href={`/dashboard/groupes/${session.id}`}
      className={`group block rounded-xl border shadow-[var(--elev-1)] transition-[transform,box-shadow,border-color] duration-[140ms] hover:-translate-y-px hover:shadow-[var(--elev-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] ${variantStyles[variant]} ${cardPadding}`}
    >
      {/* Message d'action prioritaire — Sessions en cours seulement */}
      {variant === "ongoing" && pending > 0 && (
        <div className="mb-2 flex items-start gap-1.5">
          {isUrgent ? (
            <AlertCircle size={12} strokeWidth={2.2} className="mt-0.5 shrink-0 text-[#dc2626]" aria-hidden />
          ) : isCompleting ? (
            <AlertTriangle size={12} strokeWidth={2.2} className="mt-0.5 shrink-0 text-[#d97706]" aria-hidden />
          ) : null}
          <p className={`text-[12px] font-semibold leading-snug ${
            isUrgent
              ? "text-[#dc2626]"
              : isCompleting
              ? "text-[#d97706]"
              : "text-[var(--color-brand)]"
          }`}>
            {pending === 1
              ? "1 validation en attente"
              : `${pending} validations en attente`}
          </p>
        </div>
      )}

      {/* Titre — hiérarchie forte pour ongoing */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex-1 min-w-0">
          <h3 className={`truncate leading-tight tracking-tight ${
            variant === "completed"
              ? "text-[12.5px] font-medium text-[var(--color-foreground)]"
              : variant === "ongoing"
              ? "text-[15px] font-bold text-[var(--color-foreground)]"
              : "text-[13.5px] font-semibold text-[var(--color-foreground)]"
          }`}>
            {session.name}
          </h3>
          {variant !== "completed" && (
            <p className={`mt-0.5 truncate ${
              variant === "ongoing"
                ? "text-[11px] text-[var(--color-muted)]/75"
                : "text-[10.5px] text-[var(--color-muted)]/70"
            }`}>
              {session.template_title}
            </p>
          )}
        </div>

        {variant === "ongoing" && pending > 0 && appUrl && (
          <CardQrButton
            publicUrl={`${appUrl}/g/${session.public_token}`}
            sessionName={session.name}
          />
        )}
        {variant === "ongoing" && session.status === "open" && pending === 0 && (
          <CheckCircle2 size={15} strokeWidth={2.2} className="text-[var(--color-brand)] shrink-0 mt-0.5" />
        )}
      </div>

      {/* Informations temporelles — minimales pour upcoming et completed */}
      {variant !== "completed" && (timeInfo.startTime || timeInfo.endTime) && (
        <div className={`flex flex-wrap items-center gap-x-2 gap-y-0.5 mb-1.5 ${
          variant === "ongoing"
            ? "text-[11px] text-[var(--color-muted)]/70"
            : "text-[10.5px] text-[var(--color-muted)]/65"
        }`}>
          {variant === "upcoming" && timeInfo.startTime && (() => {
            const today = new Date();
            const isToday =
              timeInfo.startTime.getDate() === today.getDate() &&
              timeInfo.startTime.getMonth() === today.getMonth() &&
              timeInfo.startTime.getFullYear() === today.getFullYear();
            return !isToday ? (
              <div className="flex items-center gap-1">
                <Calendar size={11} strokeWidth={1.9} />
                <span className="capitalize">{formatSessionDate(timeInfo.startTime)}</span>
              </div>
            ) : null;
          })()}

          {timeInfo.startTime && timeInfo.endTime && (
            <>
              <div className="flex items-center gap-1">
                <Clock size={11} strokeWidth={1.9} />
                <span>{formatTimeRange(timeInfo.startTime, timeInfo.endTime)}</span>
              </div>
              {variant === "ongoing" && timeInfo.durationMinutes && (
                <>
                  <span className="text-[var(--color-muted)]/35">·</span>
                  <span>{formatSessionDuration(timeInfo.durationMinutes)}</span>
                </>
              )}
            </>
          )}

          {variant === "upcoming" && timeInfo.timeUntilStart && timeInfo.timeUntilStart > 0 && (
            <>
              {timeInfo.startTime && <span className="text-[var(--color-muted)]/30">·</span>}
              <span className="font-semibold text-[var(--color-brand)]">
                {getTimeUntilText(timeInfo.timeUntilStart)}
              </span>
            </>
          )}
        </div>
      )}

      {/* Stats et progression — visuellement forte pour ongoing, masquées pour completed */}
      {variant !== "completed" && (
        <>
          <div className={`flex items-center gap-1.5 ${variant === "ongoing" ? "mb-1.5" : "mb-1"}`}>
            <div className={`flex items-center gap-1.5 ${
              variant === "ongoing" ? "text-[12.5px]" : "text-[11.5px]"
            }`}>
              <Users size={12} strokeWidth={1.9} className="text-[var(--color-muted)]/80" />
              <span className={`tabular-nums ${
                variant === "ongoing"
                  ? "font-semibold text-[var(--color-foreground)]"
                  : "font-medium text-[var(--color-foreground)]/90"
              }`}>
                {session.signed}
              </span>
              <span className="text-[var(--color-muted)]/60">/</span>
              <span className={`tabular-nums ${
                variant === "ongoing"
                  ? "font-semibold text-[var(--color-foreground)]"
                  : "font-medium text-[var(--color-foreground)]/90"
              }`}>
                {session.total}
              </span>
            </div>
          </div>

          <GroupProgressBar
            signed={session.signed}
            total={session.total}
            variant="default"
          />
        </>
      )}
    </Link>
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

  // Classifier les sessions en utilisant les champs temporels V2.
  // Priorité : start_time (V2) > scheduled_at (V1 legacy)

  /** Retourne true si la session est à venir (pas encore commencée). */
  function isSessionUpcoming(g: DashboardGroupRow): boolean {
    if (g.status !== "open") return false;
    // Préférer start_time (V2), sinon scheduled_at (V1)
    const timeRef = g.start_time ?? g.scheduled_at;
    if (!timeRef) return false;
    return new Date(timeRef) > now;
  }

  /** Retourne true si la session est terminée (tous signés, fermée, ou end_time dépassé). */
  function isSessionCompleted(g: DashboardGroupRow): boolean {
    if (g.status === "archived") return false;
    if (g.status === "closed") return true;
    if (g.signed >= g.total && g.total > 0) return true;
    if (g.end_time && new Date(g.end_time) < now) return true;
    return false;
  }

  // Séparer les sessions en cours en deux catégories
  const ongoingSessions = groups.filter(g =>
    g.status === "open" &&
    !isSessionUpcoming(g) &&
    !isSessionCompleted(g)
  );

  // Action requise : signatures manquantes
  const actionRequired = ongoingSessions
    .filter(g => g.total > 0 && g.signed < g.total)
    .sort((a, b) => {
      // Les plus urgentes en premier : moins de temps restant, plus de signatures manquantes
      const aTimeInfo = getSessionTimeInfo(a.start_time, a.end_time, a.duration_minutes);
      const bTimeInfo = getSessionTimeInfo(b.start_time, b.end_time, b.duration_minutes);

      const aEndMs = aTimeInfo.endTime ? aTimeInfo.endTime.getTime() : Infinity;
      const bEndMs = bTimeInfo.endTime ? bTimeInfo.endTime.getTime() : Infinity;

      const aRemaining = Math.max(0, aEndMs - now.getTime());
      const bRemaining = Math.max(0, bEndMs - now.getTime());

      // Trier par temps restant croissant
      if (aRemaining !== bRemaining) {
        return aRemaining - bRemaining;
      }

      // Si même urgence, trier par nombre de signatures manquantes décroissant
      const aPending = a.total - a.signed;
      const bPending = b.total - b.signed;
      return bPending - aPending;
    });

  // Prêtes : toutes les signatures obtenues
  const readySessions = ongoingSessions
    .filter(g => g.total > 0 && g.signed >= g.total);

  const upcomingSessions = groups
    .filter(isSessionUpcoming)
    .sort((a, b) => {
      // Trier par heure de début croissante
      const aTime = a.start_time ?? a.scheduled_at ?? "";
      const bTime = b.start_time ?? b.scheduled_at ?? "";
      return aTime.localeCompare(bTime);
    })
    .slice(0, 4);

  const completedSessions = groups
    .filter(isSessionCompleted)
    .slice(0, 4);

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Action requise - PRIORITÉ MAXIMUM */}
      {actionRequired.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--color-brand)_16%,transparent)] text-[var(--color-brand)]">
              <AlertCircle size={16} strokeWidth={2.2} />
            </span>
            <div className="flex items-baseline gap-2">
              <h2 className="text-[15px] font-bold tracking-tight text-[var(--color-foreground)]">
                Action requise
              </h2>
              <span className="text-[12px] font-semibold tabular-nums text-[var(--color-brand)]">
                {actionRequired.length}
              </span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {actionRequired.map(session => (
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

      {/* 2. Prêtes - Signatures complètes */}
      {readySessions.length > 0 && (
        <section>
          <div className="mb-2.5 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--color-brand)_12%,transparent)] text-[var(--color-brand)]">
              <CheckCircle2 size={14} strokeWidth={2} />
            </span>
            <div className="flex items-baseline gap-2">
              <h2 className="text-[13.5px] font-semibold tracking-tight text-[var(--color-foreground)]">
                Prêtes
              </h2>
              <span className="text-[11px] font-medium tabular-nums text-[var(--color-muted)]/70">
                {readySessions.length}
              </span>
            </div>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {readySessions.map(session => (
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

      {/* 3. À venir - Plus discrètes */}
      {upcomingSessions.length > 0 && (
        <section>
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--color-muted)_8%,transparent)] text-[var(--color-muted)]">
              <CalendarClock size={13} strokeWidth={2} />
            </span>
            <div className="flex items-baseline gap-2">
              <h2 className="text-[12.5px] font-semibold tracking-tight text-[var(--color-foreground)]/90">
                À venir
              </h2>
              <span className="text-[10.5px] font-medium tabular-nums text-[var(--color-muted)]/60">
                {upcomingSessions.length}
              </span>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingSessions.map(session => (
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

      {/* 4. Terminées aujourd'hui - Très discrètes */}
      {completedSessions.length > 0 && (
        <section>
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--color-muted)_6%,transparent)] text-[var(--color-muted)]/70">
              <CheckCircle2 size={12} strokeWidth={2} />
            </span>
            <div className="flex items-baseline gap-2">
              <h2 className="text-[12px] font-medium tracking-tight text-[var(--color-foreground)]/75">
                Terminées aujourd&apos;hui
              </h2>
              <span className="text-[10px] font-medium tabular-nums text-[var(--color-muted)]/55">
                {completedSessions.length}
              </span>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {completedSessions.map(session => (
              <SessionCard
                key={session.id}
                session={session}
                variant="completed"
                appUrl={appUrl}
              />
            ))}
          </div>
        </section>
      )}

      {/* État vide */}
      {actionRequired.length === 0 && readySessions.length === 0 && upcomingSessions.length === 0 && completedSessions.length === 0 && (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="mb-3.5 flex h-12 w-12 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--color-muted)_7%,transparent)]">
            <Calendar size={22} strokeWidth={1.8} className="text-[var(--color-muted)]" />
          </div>
          <p className="text-[14px] font-semibold text-[var(--color-foreground)]">
            Aucune session aujourd&apos;hui
          </p>
          <p className="mt-1 text-[12.5px] text-[var(--color-muted)]">
            Créez une nouvelle session pour commencer
          </p>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('open-new-session-modal'))}
            className="mt-3.5 inline-flex h-9 items-center gap-1.5 rounded-xl bg-[var(--color-brand)] px-4 text-[12.5px] font-semibold text-[var(--color-on-brand)] shadow-[var(--elev-1)] transition-[transform,filter,box-shadow] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px hover:brightness-[1.03] hover:shadow-[var(--elev-2)]"
          >
            <Plus size={14} strokeWidth={2.2} aria-hidden />
            Nouvelle session
          </button>
        </div>
      )}
    </div>
  );
}
