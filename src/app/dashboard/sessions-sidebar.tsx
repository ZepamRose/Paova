"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { CheckCircle2, Clock, Users } from "lucide-react";
import type { DashboardGroupRow } from "@/lib/dashboard/types";
import { resolveGroupSigningState } from "@/lib/groups/signing-state";
import { useLiveTime } from "@/hooks/use-live-time";
import { getRecentSignatures, type RecentSignature } from "./sessions-signatures-action";

// ─── Relative time helper ─────────────────────────────────────────────────────

function fmtRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH} h`;
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

// ─── Daily Stats ─────────────────────────────────────────────────────────────

function DailyStats({ groups }: { groups: DashboardGroupRow[] }) {
  const now = useLiveTime();
  const today = new Date(now);
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const todayGroups = groups.filter((g) => {
    if (g.status === "archived") return false;
    const ref = g.start_time ?? g.scheduled_at;
    if (!ref) return g.status === "open";
    const t = new Date(ref);
    return t >= todayStart && t < todayEnd;
  });

  const totalSigned = todayGroups.reduce((s, g) => {
    const state = resolveGroupSigningState(g);
    return s + state.coveredSigned;
  }, 0);
  const totalPeople = todayGroups.reduce((s, g) => s + g.total, 0);
  const totalPending = Math.max(0, totalPeople - totalSigned);
  const completionRate =
    totalPeople > 0 ? Math.round((totalSigned / totalPeople) * 100) : 0;

  const stats = [
    { label: "Activités", value: todayGroups.length, icon: Clock },
    { label: "Signatures", value: `${totalSigned}/${totalPeople}`, icon: CheckCircle2 },
    { label: "En attente", value: totalPending, icon: Users },
    { label: "Taux", value: `${completionRate}%`, icon: CheckCircle2, highlight: completionRate === 100 },
  ];

  return (
    <div className="rounded-xl border border-[color-mix(in_srgb,var(--color-border)_50%,transparent)] bg-[var(--color-surface)] p-4">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)]/60">
        Aujourd&apos;hui
      </p>
      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className="flex flex-col gap-0.5">
            <span className="text-[10.5px] font-medium text-[var(--color-muted)]/55 uppercase tracking-wider">
              {stat.label}
            </span>
            <span
              className={`text-[18px] font-semibold tabular-nums leading-none tracking-tight ${
                stat.highlight
                  ? "text-[#10b981]"
                  : "text-[var(--color-foreground)]"
              }`}
            >
              {stat.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Recent Signatures ────────────────────────────────────────────────────────

function SignatureRow({ sig }: { sig: RecentSignature }) {
  const isRep = sig.signature_type === "group_representative";
  const activityName = sig.group_name ?? sig.template_title;
  const href = sig.group_id
    ? `/dashboard/groupes/${sig.group_id}`
    : `/dashboard/waivers/${sig.template_id}`;

  return (
    <Link
      href={href}
      className="group flex items-start gap-2.5 rounded-lg px-2.5 py-2 transition-colors duration-150 hover:bg-[var(--color-surface-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-brand)]"
    >
      {/* Avatar initiale */}
      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-brand)_10%,transparent)] text-[10px] font-semibold text-[var(--color-brand)]">
        {sig.signer_name.charAt(0).toUpperCase()}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[12.5px] font-semibold text-[var(--color-foreground)] group-hover:text-[var(--color-brand)]">
            {sig.signer_name}
          </span>
          {isRep && (
            <span className="shrink-0 rounded-sm bg-[color-mix(in_srgb,var(--color-brand)_12%,transparent)] px-1 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-[var(--color-brand)]">
              Rep.
            </span>
          )}
        </div>
        <p className="truncate text-[11px] text-[var(--color-muted)]">
          {activityName}
        </p>
      </div>

      <span className="mt-0.5 shrink-0 text-[10.5px] tabular-nums text-[var(--color-muted)]/60">
        {fmtRelativeTime(sig.signed_at)}
      </span>
    </Link>
  );
}

function RecentSignaturesBloc({
  businessId,
  initialSignatures,
}: {
  businessId: string;
  initialSignatures: RecentSignature[];
}) {
  const [signatures, setSignatures] = useState<RecentSignature[]>(initialSignatures);

  const refresh = useCallback(async () => {
    try {
      const fresh = await getRecentSignatures(businessId);
      setSignatures(fresh);
    } catch {
      // Fail silently — stale data is acceptable
    }
  }, [businessId]);

  // Poll every 30 seconds
  useEffect(() => {
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
  }, [refresh]);

  return (
    <div className="rounded-xl border border-[color-mix(in_srgb,var(--color-border)_50%,transparent)] bg-[var(--color-surface)]">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted)]/60">
          Dernières signatures
        </p>
        {signatures.length > 0 && (
          <span className="text-[10.5px] tabular-nums text-[var(--color-muted)]/50">
            {signatures.length}
          </span>
        )}
      </div>

      {signatures.length === 0 ? (
        <p className="px-4 pb-4 text-[12px] text-[var(--color-muted)]/60">
          Aucune signature récente.
        </p>
      ) : (
        <div className="px-1.5 pb-2">
          {signatures.map((sig) => (
            <SignatureRow key={sig.id} sig={sig} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export function SessionsSidebar({
  groups,
  businessId,
  initialSignatures,
}: {
  groups: DashboardGroupRow[];
  businessId: string;
  initialSignatures: RecentSignature[];
}) {
  return (
    <aside className="flex w-[260px] shrink-0 flex-col gap-3">
      <DailyStats groups={groups} />
      <RecentSignaturesBloc
        businessId={businessId}
        initialSignatures={initialSignatures}
      />
    </aside>
  );
}
