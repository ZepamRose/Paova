"use client";

import { useEffect, useState } from "react";
import {
  computeSessionPhase,
  formatCountdown,
  type SessionPhase,
} from "@/lib/session-time";

/**
 * Badge de statut de session avec countdown en temps réel.
 *
 * S'hydrate côté client pour afficher un compteur vivant.
 * Le rendu serveur affiche un état initial stable (sans countdown).
 */
export function SessionStatusBadge({
  dbStatus,
  startTime,
  endTime,
  allSigned,
}: {
  dbStatus: string;
  startTime: string | null;
  endTime: string | null;
  allSigned: boolean;
}) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const phase = computeSessionPhase(dbStatus, startTime, endTime, allSigned);
    // Tick rapide en zone critique (< 5 min), lent sinon
    const interval = phase === "completing" ? 1000 : 30_000;
    const id = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(id);
  }, [dbStatus, startTime, endTime, allSigned]);

  const phase: SessionPhase =
    now === null
      ? computeSessionPhase(dbStatus, startTime, endTime, allSigned)
      : computeSessionPhase(dbStatus, startTime, endTime, allSigned);

  const endMs = endTime ? new Date(endTime).getTime() : null;
  const startMs = startTime ? new Date(startTime).getTime() : null;
  const currentNow = now ?? Date.now();

  const remainingMs = endMs ? Math.max(0, endMs - currentNow) : null;
  const untilStartMs = startMs ? Math.max(0, startMs - currentNow) : null;

  return (
    <div className="flex items-center gap-2.5">
      <PhaseBadge phase={phase} />
      {phase === "active" && remainingMs !== null && (
        <span className="text-[13px] font-medium tabular-nums text-[var(--color-muted)]">
          {formatCountdown(remainingMs)} restantes
        </span>
      )}
      {phase === "completing" && remainingMs !== null && (
        <span className="text-[13px] font-semibold tabular-nums text-[color-mix(in_srgb,#d97706_85%,var(--color-foreground))]">
          {formatCountdown(remainingMs)} restantes
        </span>
      )}
      {phase === "preparing" && untilStartMs !== null && (
        <span className="text-[13px] font-medium tabular-nums text-[var(--color-muted)]">
          dans {formatCountdown(untilStartMs)}
        </span>
      )}
    </div>
  );
}

function PhaseBadge({ phase }: { phase: SessionPhase }) {
  switch (phase) {
    case "active":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--color-brand)_12%,transparent)] px-2.5 py-1 text-[11.5px] font-semibold tracking-wide text-[var(--color-brand)]">
          <span className="relative flex h-1.5 w-1.5" aria-hidden>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-brand)] opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--color-brand)]" />
          </span>
          EN COURS
        </span>
      );
    case "completing":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,#d97706_10%,transparent)] px-2.5 py-1 text-[11.5px] font-semibold tracking-wide text-[color-mix(in_srgb,#d97706_85%,var(--color-foreground))]">
          <span aria-hidden>⚠</span>
          SE TERMINE
        </span>
      );
    case "preparing":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--color-muted)_10%,transparent)] px-2.5 py-1 text-[11.5px] font-semibold tracking-wide text-[var(--color-muted)]">
          <span aria-hidden>◷</span>
          À VENIR
        </span>
      );
    case "done":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--color-brand)_10%,transparent)] px-2.5 py-1 text-[11.5px] font-semibold tracking-wide text-[color-mix(in_srgb,var(--color-brand)_70%,var(--color-muted))]">
          <span aria-hidden>✓</span>
          TERMINÉE
        </span>
      );
    case "archived":
      return (
        <span className="inline-flex items-center rounded-full bg-[var(--color-surface-2)] px-2.5 py-1 text-[11.5px] font-medium tracking-wide text-[var(--color-muted)]">
          ARCHIVÉE
        </span>
      );
  }
}
