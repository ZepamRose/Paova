"use client";

import { CheckCircle2, AlertCircle } from "lucide-react";
import type { DashboardGroupRow } from "@/lib/dashboard/types";

function getStatusMessage(
  todayGroups: DashboardGroupRow[],
  totalPending: number
): { message: string; color: string; icon: typeof CheckCircle2 } {
  if (todayGroups.length === 0) {
    return {
      message: "Aucune activité prévue aujourd'hui",
      color: "text-[var(--color-muted)]",
      icon: CheckCircle2,
    };
  }

  if (totalPending === 0) {
    return {
      message: "Tout est sous contrôle aujourd'hui",
      color: "text-[#10b981]",
      icon: CheckCircle2,
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
    const count = todayGroups.filter((g) => g.total > 0 && g.signed < g.total).length;
    return {
      message: count === 1 ? "1 session demande votre attention" : `${count} sessions demandent votre attention`,
      color: "text-[#ef4444]",
      icon: AlertCircle,
    };
  }

  const count = todayGroups.filter((g) => g.total > 0 && g.signed < g.total).length;
  return {
    message: count === 1 ? "1 session en attente" : `${count} sessions en attente`,
    color: "text-[#f59e0b]",
    icon: AlertCircle,
  };
}

export function DashboardTodayHero({ groups }: { groups: DashboardGroupRow[] }) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const todayGroups = groups.filter((g) => {
    if (g.status === "archived") return false;

    if (g.start_time) {
      const t = new Date(g.start_time);
      return t >= todayStart && t < todayEnd;
    }
    if (g.scheduled_at) {
      const t = new Date(g.scheduled_at);
      return t >= todayStart && t < todayEnd;
    }

    return g.status === "open";
  });

  const totalPeople = todayGroups.reduce((sum, g) => sum + g.total, 0);
  const totalSigned = todayGroups.reduce((sum, g) => sum + g.signed, 0);
  const totalPending = totalPeople - totalSigned;

  const status = getStatusMessage(todayGroups, totalPending);
  const StatusIcon = status.icon;

  return (
    <section
      aria-label="État du jour"
      className="relative overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_48%,transparent)] bg-[var(--color-surface)] px-5 py-4 shadow-sm"
    >
      {/* Subtle gradient */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(72% 58% at 11% -6%, color-mix(in srgb, var(--color-brand) 8%, transparent), transparent 60%)",
        }}
      />

      <div className="relative flex items-center gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--color-brand)_8%,transparent)]`}>
          <StatusIcon size={18} strokeWidth={2.2} className={status.color} aria-hidden />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-[15px] font-semibold leading-snug tracking-tight ${status.color}`}>
            {status.message}
          </p>
        </div>
      </div>
    </section>
  );
}
