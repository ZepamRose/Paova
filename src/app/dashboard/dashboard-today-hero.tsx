"use client";

import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, AlertCircle, Clock } from "lucide-react";
import type { DashboardGroupRow } from "@/lib/dashboard/types";
import {
  DASHBOARD_ENTRANCE_DURATION,
  DASHBOARD_ENTRANCE_EASE,
  DashboardEntrance,
} from "./dashboard-entrance";

type TodayStatus = {
  state: "ready" | "attention" | "urgent";
  icon: typeof CheckCircle2;
  label: string;
  color: string;
  bgColor: string;
  ringColor: string;
};

function getTodayStatus(
  todayGroups: DashboardGroupRow[],
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

  // Urgent: sessions se terminant dans moins de 30 min avec des signatures manquantes
  const now = new Date();
  const hasUrgent = todayGroups.some((g) => {
    if (g.total === 0 || g.signed >= g.total) return false;
    if (!g.end_time) return false;
    const msUntilEnd = new Date(g.end_time).getTime() - now.getTime();
    const minutesUntilEnd = msUntilEnd / 60000;
    return minutesUntilEnd > 0 && minutesUntilEnd <= 30;
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
  todayGroups: DashboardGroupRow[],
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

export function DashboardTodayHero({ groups }: { groups: DashboardGroupRow[] }) {
  const reduced = useReducedMotion() ?? false;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const todayGroups = groups.filter((g) => {
    if (g.status === "archived") return false;

    // Préférer start_time (V2), sinon scheduled_at (V1 legacy)
    if (g.start_time) {
      const t = new Date(g.start_time);
      return t >= todayStart && t < todayEnd;
    }
    if (g.scheduled_at) {
      const t = new Date(g.scheduled_at);
      return t >= todayStart && t < todayEnd;
    }

    // Session ouverte sans horaire = active aujourd'hui
    return g.status === "open";
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
      className="relative overflow-hidden rounded-[1.25rem] border border-[color-mix(in_srgb,var(--color-border)_48%,transparent)] bg-[var(--color-surface)] shadow-[var(--elev-2)] ring-1 ring-black/[0.015] dark:ring-white/[0.035]"
    >
      {/* Subtle gradient */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(72% 58% at 11% -6%, color-mix(in srgb, var(--color-brand) 10%, transparent), transparent 60%)",
        }}
      />

      <div className="relative flex flex-col gap-3.5 p-4 sm:p-4.5 lg:p-5">
        <DashboardEntrance step={0} className="flex flex-col gap-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <h2 className="text-[11px] font-medium uppercase tracking-[0.09em] text-[var(--color-muted)]/65">
                Aujourd&apos;hui
              </h2>
              <p className="text-[1.3rem] font-semibold leading-tight tracking-[-0.018em] text-[var(--color-foreground)] sm:text-[1.4rem]">
                {new Date().toLocaleDateString("fr-FR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </p>
            </div>

            {/* Status badge */}
            <div
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 ring-1 ${status.bgColor} ${status.ringColor}`}
            >
              <StatusIcon size={14} strokeWidth={2.3} className={status.color} aria-hidden />
              <span className={`text-[12px] font-semibold ${status.color}`}>
                {status.label}
              </span>
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-2.5">
            <motion.div
              initial={reduced ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: DASHBOARD_ENTRANCE_DURATION, delay: reduced ? 0 : 0.04, ease: DASHBOARD_ENTRANCE_EASE }}
              className="flex flex-col gap-0.5 rounded-lg bg-[var(--color-surface-2)]/35 px-3 py-2.5"
            >
              <span className="text-[10.5px] font-medium uppercase tracking-[0.07em] text-[var(--color-muted)]/65">
                Activités
              </span>
              <span className="text-[1.6rem] font-semibold tabular-nums leading-none tracking-[-0.02em] text-[var(--color-foreground)]">
                {totalActivities}
              </span>
            </motion.div>

            <motion.div
              initial={reduced ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: DASHBOARD_ENTRANCE_DURATION, delay: reduced ? 0 : 0.07, ease: DASHBOARD_ENTRANCE_EASE }}
              className="flex flex-col gap-0.5 rounded-lg bg-[var(--color-surface-2)]/35 px-3 py-2.5"
            >
              <span className="text-[10.5px] font-medium uppercase tracking-[0.07em] text-[var(--color-muted)]/65">
                Personnes
              </span>
              <span className="text-[1.6rem] font-semibold tabular-nums leading-none tracking-[-0.02em] text-[var(--color-foreground)]">
                {totalPeople}
              </span>
            </motion.div>

            <motion.div
              initial={reduced ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: DASHBOARD_ENTRANCE_DURATION, delay: reduced ? 0 : 0.10, ease: DASHBOARD_ENTRANCE_EASE }}
              className="flex flex-col gap-0.5 rounded-lg bg-[var(--color-surface-2)]/35 px-3 py-2.5"
            >
              <span className="text-[10.5px] font-medium uppercase tracking-[0.07em] text-[var(--color-muted)]/65">
                Validées
              </span>
              <span className="text-[1.6rem] font-semibold tabular-nums leading-none tracking-[-0.02em] text-[var(--color-foreground)]">
                {totalSigned}
              </span>
            </motion.div>

            <motion.div
              initial={reduced ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: DASHBOARD_ENTRANCE_DURATION, delay: reduced ? 0 : 0.13, ease: DASHBOARD_ENTRANCE_EASE }}
              className="flex flex-col gap-0.5 rounded-lg bg-[var(--color-surface-2)]/35 px-3 py-2.5"
            >
              <span className="text-[10.5px] font-medium uppercase tracking-[0.07em] text-[var(--color-muted)]/65">
                Restantes
              </span>
              <span
                className={`text-[1.6rem] font-semibold tabular-nums leading-none tracking-[-0.02em] ${
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
              initial={reduced ? false : { opacity: 0, y: -3 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: DASHBOARD_ENTRANCE_DURATION, delay: reduced ? 0 : 0.16, ease: DASHBOARD_ENTRANCE_EASE }}
              className="rounded-lg bg-[var(--color-surface-2)]/45 px-3 py-2 text-[12.5px] leading-snug text-[var(--color-foreground)]/80"
            >
              {actionMessage}
            </motion.p>
          ) : null}
        </DashboardEntrance>
      </div>
    </section>
  );
}
