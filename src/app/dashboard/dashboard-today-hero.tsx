"use client";

import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, AlertCircle, Clock } from "lucide-react";
import {
  DASHBOARD_ENTRANCE_DURATION,
  DASHBOARD_ENTRANCE_EASE,
  DashboardEntrance,
} from "./dashboard-entrance";

type DashboardGroup = {
  id: string;
  name: string;
  status: string;
  scheduled_at: string | null;
  start_time: string | null;
  total: number;
  signed: number;
};

type TodayStatus = {
  state: "ready" | "attention" | "urgent";
  icon: typeof CheckCircle2;
  label: string;
  color: string;
  bgColor: string;
  ringColor: string;
};

function getTodayStatus(
  todayGroups: DashboardGroup[],
  totalPending: number
): TodayStatus {
  if (todayGroups.length === 0) {
    return {
      state: "ready",
      icon: CheckCircle2,
      label: "Aucune activité prévue",
      color: "text-[var(--color-muted)]",
      bgColor: "bg-[color-mix(in_srgb,var(--color-foreground)_8%,transparent)]",
      ringColor: "ring-[color-mix(in_srgb,var(--color-foreground)_12%,transparent)]",
    };
  }

  if (totalPending === 0) {
    return {
      state: "ready",
      icon: CheckCircle2,
      label: "Tout est prêt",
      color: "text-[#10b981]",
      bgColor: "bg-[color-mix(in_srgb,#10b981_11%,transparent)]",
      ringColor: "ring-[color-mix(in_srgb,#10b981_18%,transparent)]",
    };
  }

  // Check for urgent cases (sessions starting soon with pending signatures)
  const now = new Date();
  const hasUrgent = todayGroups.some((g) => {
    if (g.total === 0 || g.signed === g.total) return false;
    if (!g.start_time) return false;

    const startTime = new Date(g.start_time);
    const msUntilStart = startTime.getTime() - now.getTime();
    const hoursUntilStart = msUntilStart / (1000 * 60 * 60);

    // Urgent if starting in less than 2 hours with pending signatures
    return hoursUntilStart < 2 && hoursUntilStart > 0;
  });

  if (hasUrgent) {
    return {
      state: "urgent",
      icon: AlertCircle,
      label: "Action urgente requise",
      color: "text-[#ef4444]",
      bgColor: "bg-[color-mix(in_srgb,#ef4444_11%,transparent)]",
      ringColor: "ring-[color-mix(in_srgb,#ef4444_18%,transparent)]",
    };
  }

  return {
    state: "attention",
    icon: Clock,
    label: "Attention requise",
    color: "text-[#f59e0b]",
    bgColor: "bg-[color-mix(in_srgb,#f59e0b_11%,transparent)]",
    ringColor: "ring-[color-mix(in_srgb,#f59e0b_18%,transparent)]",
  };
}

function getActionMessage(
  todayGroups: DashboardGroup[],
  totalPending: number
): string | null {
  if (todayGroups.length === 0) return null;
  if (totalPending === 0) return null;

  const groupsWithPending = todayGroups.filter(
    (g) => g.total > 0 && g.signed < g.total
  );

  if (groupsWithPending.length === 1) {
    const g = groupsWithPending[0];
    const pending = g.total - g.signed;
    return `${g.name} attend ${pending} signature${pending > 1 ? "s" : ""}.`;
  }

  if (groupsWithPending.length > 1) {
    return `${groupsWithPending.length} activités nécessitent encore votre intervention.`;
  }

  return null;
}

export function DashboardTodayHero({ groups }: { groups: DashboardGroup[] }) {
  const reduced = useReducedMotion() ?? false;

  // Filter today's groups
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const todayGroups = groups.filter((g) => {
    if (g.status === "archived") return false;

    // If has start_time, use it
    if (g.start_time) {
      const startTime = new Date(g.start_time);
      return startTime >= todayStart && startTime < todayEnd;
    }

    // If has scheduled_at (legacy), use it
    if (g.scheduled_at) {
      const scheduledTime = new Date(g.scheduled_at);
      return scheduledTime >= todayStart && scheduledTime < todayEnd;
    }

    // If no time info, consider it as "today" if it&apos;s open and recent
    if (g.status === "open") {
      return true;
    }

    return false;
  });

  const totalActivities = todayGroups.length;
  const totalPeople = todayGroups.reduce((sum, g) => sum + g.total, 0);
  const totalSigned = todayGroups.reduce((sum, g) => sum + g.signed, 0);
  const totalPending = totalPeople - totalSigned;

  const status = getTodayStatus(todayGroups, totalPending);
  const actionMessage = getActionMessage(todayGroups, totalPending);
  const StatusIcon = status.icon;

  return (
    <section
      aria-label="Aperçu du jour"
      className="relative overflow-hidden rounded-[1.5rem] border border-[color-mix(in_srgb,var(--color-border)_50%,transparent)] bg-[var(--color-surface)] shadow-[var(--elev-3)] ring-1 ring-black/[0.02] dark:ring-white/[0.045]"
    >
      {/* Subtle gradient */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(75% 60% at 12% -8%, color-mix(in srgb, var(--color-brand) 11%, transparent), transparent 62%)",
        }}
      />

      <div className="relative flex flex-col gap-5 p-5 sm:p-6 lg:p-7">
        <DashboardEntrance step={0} className="flex flex-col gap-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h2 className="text-[13px] font-medium uppercase tracking-[0.08em] text-[var(--color-muted)]/70">
                Aujourd&apos;hui
              </h2>
              <p className="text-[1.5rem] font-semibold leading-tight tracking-[-0.02em] text-[var(--color-foreground)] sm:text-[1.65rem] sm:tracking-[-0.022em]">
                {new Date().toLocaleDateString("fr-FR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </p>
            </div>

            {/* Status badge */}
            <div
              className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 ring-1 ${status.bgColor} ${status.ringColor}`}
            >
              <StatusIcon size={16} strokeWidth={2.2} className={status.color} aria-hidden />
              <span className={`text-[13px] font-semibold ${status.color}`}>
                {status.label}
              </span>
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            <motion.div
              initial={reduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: DASHBOARD_ENTRANCE_DURATION,
                delay: reduced ? 0 : 0.05,
                ease: DASHBOARD_ENTRANCE_EASE,
              }}
              className="flex flex-col gap-1 rounded-lg bg-[var(--color-surface-2)]/40 px-3.5 py-3"
            >
              <span className="text-[11.5px] font-medium uppercase tracking-[0.06em] text-[var(--color-muted)]/70">
                Activités
              </span>
              <span className="text-[1.75rem] font-semibold tabular-nums leading-none tracking-[-0.02em] text-[var(--color-foreground)]">
                {totalActivities}
              </span>
            </motion.div>

            <motion.div
              initial={reduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: DASHBOARD_ENTRANCE_DURATION,
                delay: reduced ? 0 : 0.08,
                ease: DASHBOARD_ENTRANCE_EASE,
              }}
              className="flex flex-col gap-1 rounded-lg bg-[var(--color-surface-2)]/40 px-3.5 py-3"
            >
              <span className="text-[11.5px] font-medium uppercase tracking-[0.06em] text-[var(--color-muted)]/70">
                Personnes
              </span>
              <span className="text-[1.75rem] font-semibold tabular-nums leading-none tracking-[-0.02em] text-[var(--color-foreground)]">
                {totalPeople}
              </span>
            </motion.div>

            <motion.div
              initial={reduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: DASHBOARD_ENTRANCE_DURATION,
                delay: reduced ? 0 : 0.11,
                ease: DASHBOARD_ENTRANCE_EASE,
              }}
              className="flex flex-col gap-1 rounded-lg bg-[var(--color-surface-2)]/40 px-3.5 py-3"
            >
              <span className="text-[11.5px] font-medium uppercase tracking-[0.06em] text-[var(--color-muted)]/70">
                Validées
              </span>
              <span className="text-[1.75rem] font-semibold tabular-nums leading-none tracking-[-0.02em] text-[var(--color-foreground)]">
                {totalSigned}
              </span>
            </motion.div>

            <motion.div
              initial={reduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: DASHBOARD_ENTRANCE_DURATION,
                delay: reduced ? 0 : 0.14,
                ease: DASHBOARD_ENTRANCE_EASE,
              }}
              className="flex flex-col gap-1 rounded-lg bg-[var(--color-surface-2)]/40 px-3.5 py-3"
            >
              <span className="text-[11.5px] font-medium uppercase tracking-[0.06em] text-[var(--color-muted)]/70">
                Restantes
              </span>
              <span
                className={`text-[1.75rem] font-semibold tabular-nums leading-none tracking-[-0.02em] ${
                  totalPending > 0
                    ? status.state === "urgent"
                      ? "text-[#ef4444]"
                      : "text-[#f59e0b]"
                    : "text-[var(--color-foreground)]"
                }`}
              >
                {totalPending}
              </span>
            </motion.div>
          </div>

          {/* Action message */}
          {actionMessage ? (
            <motion.p
              initial={reduced ? false : { opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: DASHBOARD_ENTRANCE_DURATION,
                delay: reduced ? 0 : 0.18,
                ease: DASHBOARD_ENTRANCE_EASE,
              }}
              className="rounded-lg bg-[var(--color-surface-2)]/50 px-3.5 py-2.5 text-[13.5px] leading-snug text-[var(--color-foreground)]/85"
            >
              {actionMessage}
            </motion.p>
          ) : null}
        </DashboardEntrance>
      </div>
    </section>
  );
}
