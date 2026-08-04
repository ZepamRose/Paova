"use client";

import Link from "next/link";
import { AlertTriangle, Clock, PartyPopper, CheckCircle2, Activity } from "lucide-react";
import type {
  DashboardAttentionItem,
  DashboardAttentionKind,
  DashboardGroupRow,
} from "@/lib/dashboard/types";
import { resolveGroupSigningState } from "@/lib/groups/signing-state";
import { useLiveTime } from "@/hooks/use-live-time";

const ICON: Record<DashboardAttentionKind, typeof AlertTriangle> = {
  waiver_expiring: AlertTriangle,
  group_near_complete: Clock,
  group_complete: PartyPopper,
};

const ICON_STYLE: Record<DashboardAttentionKind, string> = {
  waiver_expiring:
    "bg-[color-mix(in_srgb,#b45309_12%,var(--color-surface))] text-[color-mix(in_srgb,#92400e_88%,var(--color-foreground))]",
  group_near_complete:
    "bg-[color-mix(in_srgb,var(--color-brand)_12%,var(--color-surface))] text-[var(--color-brand)]",
  group_complete:
    "bg-[color-mix(in_srgb,var(--color-brand)_12%,var(--color-surface))] text-[var(--color-brand)]",
};

/**
 * Hero narratif — raconte l'état opérationnel en une histoire.
 * Le message guide l'action, les métriques sont secondaires.
 */
export function DashboardHero({ groups }: { groups: DashboardGroupRow[] }) {
  const now = useLiveTime();

  // Classifier les sessions — classification basée uniquement sur le temps et le statut.
  // Les signatures n'influencent JAMAIS cette classification.
  const nowDate = new Date(now);
  const activeSessions = groups.filter(g => {
    if (g.status !== "open") return false;
    const hasStarted = g.start_time ? new Date(g.start_time) <= nowDate : true;
    const hasEnded = g.end_time ? new Date(g.end_time) < nowDate : false;
    return hasStarted && !hasEnded;
  });

  const totalPending = activeSessions.reduce((sum, s) => {
    const { coveredSigned } = resolveGroupSigningState(s);
    return sum + (s.total - coveredSigned);
  }, 0);
  const sessionsWithPending = activeSessions.filter(s => {
    const { coveredSigned } = resolveGroupSigningState(s);
    return coveredSigned < s.total;
  });

  // Déterminer l'urgence
  const urgentSessions = activeSessions.filter(s => {
    if (!s.end_time) return false;
    const endMs = new Date(s.end_time).getTime();
    const remainingMs = endMs - now;
    const remainingMinutes = remainingMs / 60000;
    const { coveredSigned } = resolveGroupSigningState(s);
    return remainingMinutes > 0 && remainingMinutes <= 30 && coveredSigned < s.total;
  });

  // Construire le message narratif
  let status: "urgent" | "attention" | "calm" | "complete";
  let message: string;
  let submessage: string;

  if (urgentSessions.length > 0) {
    status = "urgent";
    const plural = urgentSessions.length > 1;
    message = `${plural ? "Des sessions se terminent" : "Une session se termine"} dans moins de 30 minutes`;
    submessage = `${totalPending} signature${totalPending > 1 ? "s" : ""} encore nécessaire${totalPending > 1 ? "s" : ""} avant la fin.`;
  } else if (totalPending > 0) {
    status = "attention";
    const sessionPlural = sessionsWithPending.length > 1;
    message = `${totalPending} signature${totalPending > 1 ? "s restent" : " reste"} en attente`;
    submessage = `${sessionsWithPending.length} session${sessionPlural ? "s nécessitent" : " nécessite"} votre intervention.`;
  } else if (activeSessions.length > 0) {
    status = "complete";
    message = "Toutes les signatures sont réunies";
    submessage = `${activeSessions.length} session${activeSessions.length > 1 ? "s actives" : " active"} — tout est prêt.`;
  } else {
    status = "calm";
    message = "Aucune session active pour le moment";
    submessage = "Créez une nouvelle session pour commencer.";
  }

  // Style selon le statut
  const statusStyles = {
    urgent: {
      bg: "bg-gradient-to-br from-[color-mix(in_srgb,#dc2626_8%,var(--color-surface))] to-[color-mix(in_srgb,#dc2626_3%,var(--color-surface))]",
      border: "border-[color-mix(in_srgb,#dc2626_25%,var(--color-border))]",
      icon: "bg-[color-mix(in_srgb,#dc2626_12%,transparent)] text-[#dc2626]",
      indicator: "bg-[#dc2626]",
      iconComponent: AlertTriangle,
      emoji: "🔴",
    },
    attention: {
      bg: "bg-gradient-to-br from-[color-mix(in_srgb,#d97706_8%,var(--color-surface))] to-[color-mix(in_srgb,#d97706_3%,var(--color-surface))]",
      border: "border-[color-mix(in_srgb,#d97706_25%,var(--color-border))]",
      icon: "bg-[color-mix(in_srgb,#d97706_12%,transparent)] text-[#d97706]",
      indicator: "bg-[#d97706]",
      iconComponent: Clock,
      emoji: "🟡",
    },
    complete: {
      bg: "bg-gradient-to-br from-[color-mix(in_srgb,var(--color-brand)_8%,var(--color-surface))] to-[color-mix(in_srgb,var(--color-brand)_3%,var(--color-surface))]",
      border: "border-[color-mix(in_srgb,var(--color-brand)_22%,var(--color-border))]",
      icon: "bg-[color-mix(in_srgb,var(--color-brand)_12%,transparent)] text-[var(--color-brand)]",
      indicator: "bg-[var(--color-brand)]",
      iconComponent: CheckCircle2,
      emoji: "✓",
    },
    calm: {
      bg: "bg-gradient-to-br from-[var(--color-surface-2)] to-[var(--color-surface)]",
      border: "border-[color-mix(in_srgb,var(--color-border)_50%,transparent)]",
      icon: "bg-[color-mix(in_srgb,var(--color-muted)_10%,transparent)] text-[var(--color-muted)]",
      indicator: "bg-[var(--color-muted)]",
      iconComponent: Activity,
      emoji: "○",
    },
  };

  const style = statusStyles[status];
  const IconComponent = style.iconComponent;

  return (
    <section
      className={`relative overflow-hidden rounded-2xl border p-6 shadow-[var(--elev-2)] ${style.bg} ${style.border}`}
      aria-label="État opérationnel"
    >
      <div className="flex items-start gap-4">
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${style.icon}`}>
          <IconComponent size={20} strokeWidth={1.8} aria-hidden />
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`flex h-2 w-2 rounded-full ${style.indicator}`} aria-hidden />
            <p className="text-[19px] font-semibold tracking-tight text-[var(--color-foreground)] leading-tight">
              {message}
            </p>
          </div>

          <p className="text-[14px] leading-relaxed text-[var(--color-muted)] mb-4">
            {submessage}
          </p>

          {/* Métriques secondaires */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-[var(--color-muted)]">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold tabular-nums text-[var(--color-foreground)]">{activeSessions.length}</span>
              <span>session{activeSessions.length > 1 ? "s" : ""} active{activeSessions.length > 1 ? "s" : ""}</span>
            </div>
            {totalPending > 0 && (
              <>
                <span className="text-[var(--color-muted)]/35">·</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold tabular-nums text-[var(--color-foreground)]">{totalPending}</span>
                  <span>en attente</span>
                </div>
              </>
            )}
            {groups.length > activeSessions.length && (
              <>
                <span className="text-[var(--color-muted)]/35">·</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold tabular-nums text-[var(--color-foreground)]">
                    {groups.length - activeSessions.length}
                  </span>
                  <span>à venir</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Priority zone — only renders when something actually needs a decision.
 * Kept compact so it never competes with the business hero above.
 */
export function DashboardAttention({
  items,
}: {
  items: DashboardAttentionItem[];
}) {
  if (items.length === 0) return null;

  return (
    <section className="flex flex-col gap-2.5" aria-label="À traiter">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.11em] text-[var(--color-muted)]">
          À traiter
        </p>
        <p className="text-[11.5px] font-bold tabular-nums text-[var(--color-muted)]/75">
          {items.length}
        </p>
      </div>
      <ul className="flex flex-col gap-2">
        {items.map((item) => {
          const Icon = ICON[item.kind];
          return (
            <li key={item.id}>
              <Link
                href={item.href}
                className="group flex items-center gap-3 rounded-xl border border-[color-mix(in_srgb,var(--color-border)_75%,transparent)] bg-[var(--color-surface)] px-3.5 py-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.02] transition-[transform,box-shadow,border-color,background-color] duration-[160ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--color-brand)_25%,var(--color-border))] hover:bg-[color-mix(in_srgb,var(--color-surface)_98%,var(--color-brand))] hover:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.08)] hover:ring-black/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] dark:ring-white/[0.03] dark:hover:ring-white/[0.06]"
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${ICON_STYLE[item.kind]}`}
                >
                  <Icon size={14} strokeWidth={2.2} aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-bold leading-tight tracking-tight text-[var(--color-foreground)]">
                    {item.title}
                  </span>
                  <span className="block truncate text-[12px] leading-snug text-[var(--color-muted)]">
                    {item.meta}
                  </span>
                </span>
                <span
                  aria-hidden
                  className="shrink-0 text-[var(--color-muted)]/35 transition-[color,transform] duration-[160ms] group-hover:translate-x-0.5 group-hover:text-[var(--color-brand)]"
                >
                  →
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
