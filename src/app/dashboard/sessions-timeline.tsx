"use client";

import { useState } from "react";
import type { DashboardGroupRow } from "@/lib/dashboard/types";
import { resolveGroupSigningState } from "@/lib/groups/signing-state";
import { getSessionTimeInfo } from "@/lib/session-time";
import { useLiveCountdown } from "@/hooks/use-live-time";
import { GroupProgressBar } from "@/components/groups/group-progress";
import { CompletedSessionModal } from "./completed-session-modal";
import { SessionActionsMenu } from "./groupes/session-actions-menu";
import { SessionQuickViewModal } from "./dashboard-sessions-view";

// Déterminer la couleur selon le temps restant avant le début
// Nouvelle règle : < 6h = Orange, >= 6h = Bleu
function getTimelineColor(
  countdownPhase: string,
  isCompleted: boolean,
  remainingMs: number | null
): {
  dotColor: string;
  segmentColor: string;
  glowColor: string;
} {
  if (isCompleted) {
    return {
      dotColor: "#d1d5db",
      segmentColor: "#e5e7eb",
      glowColor: "rgba(209, 213, 219, 0.2)"
    };
  }

  // 🟢 Vert : activité EN COURS
  if (countdownPhase === "active" || countdownPhase === "ending") {
    return {
      dotColor: "#10b981",
      segmentColor: "#10b981",
      glowColor: "rgba(16, 185, 129, 0.2)"
    };
  }

  // 🟠 Orange : activité À VENIR dans moins de 6 heures
  if (remainingMs !== null && remainingMs < 6 * 60 * 60 * 1000) {
    return {
      dotColor: "#f59e0b",
      segmentColor: "#f59e0b",
      glowColor: "rgba(245, 158, 11, 0.2)"
    };
  }

  // 🔵 Bleu : activité À VENIR (6h+ ou demain/après)
  return {
    dotColor: "#3b82f6",
    segmentColor: "#3b82f6",
    glowColor: "rgba(59, 130, 246, 0.2)"
  };
}

function TimelineRow({ session, isFirst, isLast, isCompleted, appUrl, segmentColor, nextSegmentColor, countdown }: {
  session: DashboardGroupRow;
  isFirst: boolean;
  isLast: boolean;
  isCompleted: boolean;
  appUrl: string;
  segmentColor: string;
  nextSegmentColor: string;
  countdown: ReturnType<typeof useLiveCountdown>;
}) {
  const [completedOpen, setCompletedOpen] = useState(false);
  const [quickViewOpen, setQuickViewOpen] = useState(false);

  const sigState = resolveGroupSigningState(session);
  const timeInfo = getSessionTimeInfo(session.start_time, session.end_time, session.duration_minutes);

  const { dotColor, glowColor } = getTimelineColor(
    countdown.phase,
    isCompleted,
    countdown.remainingMs
  );

  // Calculer les couleurs d'état pour le halo et la teinte d'heure
  const getStateColors = () => {
    if (isCompleted) {
      return {
        halo: 'rgba(0, 0, 0, 0)',
        timeTint: 'var(--color-muted)',
        timeBg: 'rgba(0, 0, 0, 0)',
        cardGlow: 'none',
        timelineGlow: 'none'
      };
    }

    if (countdown.phase === "active" || countdown.phase === "ending") {
      return {
        halo: 'rgba(16, 185, 129, 0.1)',
        timeTint: 'color-mix(in srgb, #10b981 40%, var(--color-muted))',
        timeBg: 'rgba(16, 185, 129, 0.04)',
        cardGlow: '0 0 0 1px rgba(16, 185, 129, 0.1), 0 0 20px -4px rgba(16, 185, 129, 0.15)',
        timelineGlow: 'subtle-glow-timeline-green 3.5s ease-in-out infinite'
      };
    }

    if (countdown.remainingMs !== null && countdown.remainingMs < 6 * 60 * 60 * 1000) {
      return {
        halo: 'rgba(249, 115, 22, 0.075)',
        timeTint: 'color-mix(in srgb, #f97316 38%, var(--color-muted))',
        timeBg: 'rgba(249, 115, 22, 0.03)',
        cardGlow: '0 0 0 1px rgba(249, 115, 22, 0.075), 0 0 18px -4px rgba(249, 115, 22, 0.12)',
        timelineGlow: 'none'
      };
    }

    return {
      halo: 'rgba(59, 130, 246, 0.06)',
      timeTint: 'color-mix(in srgb, #3b82f6 33%, var(--color-muted))',
      timeBg: 'rgba(59, 130, 246, 0.025)',
      cardGlow: '0 0 0 1px rgba(59, 130, 246, 0.06), 0 0 16px -4px rgba(59, 130, 246, 0.1)',
      timelineGlow: 'none'
    };
  };

  const stateColors = getStateColors();

  const timeStr = timeInfo.startTime
    ? timeInfo.startTime.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    : null;

  const now = Date.now();
  const variant: "ongoing" | "upcoming" =
    session.start_time && new Date(session.start_time).getTime() <= now ? "ongoing" : "upcoming";

  const showSignatures = session.requires_signature && session.total > 0;
  const showParticipants = !session.requires_signature && session.total > 0;

  const handleClick = () => {
    if (isCompleted) {
      setCompletedOpen(true);
    } else {
      setQuickViewOpen(true);
    }
  };

  // Badge "En cours" avec animation pulse et temps réel
  const isOngoing = countdown.phase === "active" || countdown.phase === "ending";

  // Calculer le temps écoulé depuis le début (pour badge "En cours")
  const elapsedMs = isOngoing && timeInfo.startTime
    ? Math.max(0, now - timeInfo.startTime.getTime())
    : null;

  const formatElapsedTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${minutes} min ${seconds} s`;
  };

  const formatElapsedTimeJSX = (ms: number): React.ReactNode => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return <>{hours}:{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</>;
    }
    return (
      <>
        {minutes} min <span className="opacity-60">{seconds} s</span>
      </>
    );
  };

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick();
          }
        }}
        className="group relative mx-2 my-1 grid cursor-pointer grid-cols-[64px_20px_1fr_186px_44px] items-center gap-4 rounded-[18px] border border-[color-mix(in_srgb,var(--color-border)_50%,transparent)] bg-[var(--color-surface)] px-4 py-[11px] transition-all duration-[200ms] ease-out hover:border-[color-mix(in_srgb,var(--color-border)_65%,transparent)] hover:bg-[color-mix(in_srgb,var(--color-surface-2)_25%,var(--color-surface))] hover:-translate-y-[0.5px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]"
        style={{
          minHeight: "50px",
          boxShadow: `${stateColors.cardGlow}, 0 0.5px 1px rgba(0,0,0,0.03), 0 1px 2px rgba(0,0,0,0.02)`,
          transition: 'all 200ms ease-out, box-shadow 600ms ease-in-out'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = `${stateColors.cardGlow}, 0 1px 2px rgba(0,0,0,0.04), 0 4px 8px rgba(0,0,0,0.03)`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = `${stateColors.cardGlow}, 0 0.5px 1px rgba(0,0,0,0.03), 0 1px 2px rgba(0,0,0,0.02)`;
        }}
      >
        {/* Colonne 1: Heure avec style planning professionnel */}
        <div className="flex items-center justify-end">
          {timeStr && (
            <span
              className="inline-flex min-w-[52px] items-center justify-center rounded-md px-2 py-1 text-[10.5px] font-semibold tabular-nums tracking-[-0.02em] transition-all duration-[600ms]"
              style={{
                color: stateColors.timeTint,
                backgroundColor: stateColors.timeBg
              }}
            >
              {timeStr}
            </span>
          )}
        </div>

        {/* Colonne 2: Timeline (ligne + point centré) avec respiration pour sessions actives */}
        <div className="relative flex h-full items-center justify-center">
          {/* Ligne du haut avec dégradé doux vers le centre */}
          {!isFirst && (
            <div
              className="absolute w-[1px] transition-opacity duration-[200ms] group-hover:opacity-[0.45]"
              style={{
                left: "50%",
                transform: "translateX(-0.5px)",
                top: "-8px",
                height: "calc(50% + 8px)",
                background: `linear-gradient(180deg, ${segmentColor} 0%, color-mix(in srgb, ${segmentColor} 85%, transparent) 100%)`,
                opacity: 0.25,
                animation: stateColors.timelineGlow
              }}
            />
          )}

          {/* Point parfaitement centré - élément principal de la timeline */}
          <div
            className="absolute h-[6px] w-[6px] rounded-full shadow-[0_0_0_2px_var(--color-surface),0_0.5px_1px_rgba(0,0,0,0.08)] transition-all duration-[600ms] group-hover:scale-[1.15]"
            style={{
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              backgroundColor: dotColor,
              boxShadow: `0 0 0 2px var(--color-surface), 0 0 3px ${glowColor}, 0 0.5px 1px rgba(0,0,0,0.08)`,
              transition: 'all 600ms cubic-bezier(0.22, 1, 0.36, 1)'
            }}
          />

          {/* Ligne du bas avec dégradé ultra-progressif et respiration pour sessions actives */}
          {!isLast && (
            <div
              className="absolute w-[1px] transition-opacity duration-[200ms] group-hover:opacity-[0.45]"
              style={{
                left: "50%",
                transform: "translateX(-0.5px)",
                bottom: "-8px",
                height: "calc(50% + 8px)",
                background: `linear-gradient(180deg,
                  color-mix(in srgb, ${segmentColor} 85%, transparent) 0%,
                  ${segmentColor} 8%,
                  ${segmentColor} 15%,
                  color-mix(in srgb, ${segmentColor} 85%, ${nextSegmentColor} 15%) 30%,
                  color-mix(in srgb, ${segmentColor} 65%, ${nextSegmentColor} 35%) 45%,
                  color-mix(in srgb, ${segmentColor} 50%, ${nextSegmentColor} 50%) 55%,
                  color-mix(in srgb, ${segmentColor} 35%, ${nextSegmentColor} 65%) 70%,
                  ${nextSegmentColor} 92%,
                  ${nextSegmentColor} 100%)`,
                opacity: 0.25,
                animation: stateColors.timelineGlow
              }}
            />
          )}
        </div>

        {/* Colonne 3: Info session */}
        <div className="min-w-0 space-y-1.5 pt-1">
          {/* Nom de la session - hiérarchie élégante et épurée */}
          <h3 className={
            "truncate text-[13.5px] font-medium leading-[1.3] tracking-[-0.02em] transition-colors duration-[600ms] " +
            (isCompleted
              ? "text-[var(--color-foreground)]/40"
              : "text-[var(--color-foreground)]/95 group-hover:text-[var(--color-brand)]")
          }>
            {session.name}
          </h3>

          {/* Ligne secondaire : badge "En cours" avec temps OU temps seul + badges */}
          <div className="flex flex-wrap items-center gap-2.5 text-[11px]">
            {/* Badge "En cours" avec point pulsant discret ET temps écoulé */}
            {isOngoing && !isCompleted && elapsedMs !== null && (
              <span
                className="inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,#10b981_15%,transparent)] bg-[color-mix(in_srgb,#10b981_10%,transparent)] px-2 py-0.5 text-[10px] font-semibold tracking-[-0.01em] text-[#059669] shadow-[0_0.5px_1px_rgba(16,185,129,0.1)] transition-all duration-[600ms]"
                style={{
                  animation: isOngoing ? 'subtle-glow-green 3s ease-in-out infinite' : 'none'
                }}
              >
                {/* Point pulsant discret - respiration lente */}
                <span className="relative flex h-1.5 w-1.5">
                  <span
                    className="absolute inline-flex h-full w-full rounded-full bg-[#10b981] opacity-40"
                    style={{
                      animation: "ping 2.5s cubic-bezier(0, 0, 0.2, 1) infinite"
                    }}
                  />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#10b981]"></span>
                </span>
                En cours • {formatElapsedTimeJSX(elapsedMs)}
              </span>
            )}

            {/* Temps (si pas en cours) */}
            {!isCompleted && countdown.remainingText && !isOngoing && (
              <span className="font-medium tabular-nums tracking-[-0.01em] text-[var(--color-muted)]/70 transition-colors duration-[600ms]">
                {countdown.remainingText}
              </span>
            )}

            {/* Badge participants (si pas de signatures) */}
            {showParticipants && !isOngoing && (
              <span className="inline-flex items-center gap-1 rounded-md border border-[color-mix(in_srgb,var(--color-brand)_12%,transparent)] bg-[color-mix(in_srgb,var(--color-brand)_8%,transparent)] px-1.5 py-0.5 text-[9.5px] font-semibold tracking-[-0.01em] text-[var(--color-brand)] shadow-[0_0.5px_1px_rgba(0,0,0,0.04)] transition-all duration-[600ms]">
                <span className="text-[10px]">👥</span>
                {session.total}
              </span>
            )}

            {/* Badge rep mode */}
            {sigState.isRepMode && !isOngoing && (
              <span className={
                "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9.5px] font-semibold tracking-[-0.01em] shadow-[0_0.5px_1px_rgba(0,0,0,0.04)] transition-all duration-[600ms] " +
                (sigState.repSigned
                  ? "border-[color-mix(in_srgb,#10b981_12%,transparent)] bg-[color-mix(in_srgb,#10b981_9%,transparent)] text-[#059669]"
                  : "border-[color-mix(in_srgb,#f59e0b_12%,transparent)] bg-[color-mix(in_srgb,#f59e0b_9%,transparent)] text-[#d97706]")
              }>
                {sigState.repSigned ? "✓" : "⏳"} Rep.
              </span>
            )}
          </div>
        </div>

        {/* Colonne 4: Progression signatures OU participants */}
        <div className="flex items-start pt-2.5">
          {showSignatures ? (
            <div className="w-full space-y-1.5">
              <div className="flex items-baseline gap-1.5 text-[10.5px]">
                <span className="font-bold tabular-nums tracking-[-0.02em] text-[var(--color-foreground)]/95 transition-colors duration-[600ms]">
                  {sigState.coveredSigned}
                </span>
                <span className="text-[var(--color-muted)]/18">/</span>
                <span className="font-medium tabular-nums tracking-[-0.01em] text-[var(--color-muted)]/65 transition-colors duration-[600ms]">
                  {session.total}
                </span>
                <span className="text-[10px] tracking-[-0.01em] text-[var(--color-muted)]/50">sig.</span>
              </div>
              <div className="relative transition-transform duration-[600ms] group-hover:scale-[1.005]">
                <GroupProgressBar
                  signed={sigState.coveredSigned}
                  total={session.total}
                  variant="default"
                />
              </div>
            </div>
          ) : showParticipants ? (
            <div className="flex items-center gap-2 rounded-lg bg-[color-mix(in_srgb,var(--color-brand)_5%,transparent)] px-3 py-1.5 transition-all duration-[600ms]">
              <span className="text-[13px]">👥</span>
              <div className="flex items-baseline gap-1">
                <span className="text-[12px] font-bold tabular-nums tracking-[-0.02em] text-[var(--color-brand)]">
                  {session.total}
                </span>
                <span className="text-[10px] font-medium tracking-[-0.01em] text-[var(--color-brand)]/70">
                  participant{session.total > 1 ? "s" : ""}
                </span>
              </div>
            </div>
          ) : null}
        </div>

        {/* Colonne 5: Menu actions - zone de clic plus grande */}
        <div className="relative flex items-start justify-end pt-0.5 opacity-50 transition-opacity duration-[600ms] group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
          {!isCompleted && (
            <div className="p-1.5 -mr-1.5">
              <SessionActionsMenu
                sessionId={session.id}
                sessionName={session.name}
                isCompleted={false}
                variant="card"
              />
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {isCompleted && (
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
          open={completedOpen}
          onClose={() => setCompletedOpen(false)}
        />
      )}

      {!isCompleted && (
        <SessionQuickViewModal
          session={session}
          variant={variant}
          appUrl={appUrl}
          open={quickViewOpen}
          onClose={() => setQuickViewOpen(false)}
        />
      )}
    </>
  );
}

export function SessionTimeline({ sessions, isCompleted = false, appUrl }: {
  sessions: DashboardGroupRow[];
  isCompleted?: boolean;
  appUrl: string;
}) {
  if (sessions.length === 0) return null;

  // Calculer les couleurs pour TOUTES les sessions avec les hooks (appel au top level)
  const allTimeInfo = sessions.map(s => getSessionTimeInfo(s.start_time, s.end_time, s.duration_minutes));
  const allCountdowns = allTimeInfo.map(info =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useLiveCountdown({ startTime: info.startTime, endTime: info.endTime })
  );

  const sessionColors = allCountdowns.map((countdown) => {
    const { segmentColor } = getTimelineColor(countdown.phase, isCompleted, countdown.remainingMs);
    return segmentColor;
  });

  return (
    <>
      {/* Keyframes CSS pour l'animation shimmer */}
      <style jsx global>{`
        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
      `}</style>

      <div className="overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--color-border)_25%,transparent)] bg-[color-mix(in_srgb,var(--color-surface-2)_25%,var(--color-background))] px-0.5 py-1 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        {sessions.map((session, i) => (
          <TimelineRow
            key={session.id}
            session={session}
            isFirst={i === 0}
            isLast={i === sessions.length - 1}
            isCompleted={isCompleted}
            appUrl={appUrl}
            segmentColor={sessionColors[i]}
            nextSegmentColor={i < sessions.length - 1 ? sessionColors[i + 1] : sessionColors[i]}
            countdown={allCountdowns[i]}
          />
        ))}
      </div>
    </>
  );
}
