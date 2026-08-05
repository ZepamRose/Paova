"use client";

import { formatTimeRange } from "@/lib/session-time";

function sessionDateLabel(date: Date): string {
  const now = new Date();
  const d = (d: Date) => d.toDateString();
  if (d(date) === d(now)) return "Aujourd'hui";
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (d(date) === d(tomorrow)) return "Demain";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d(date) === d(yesterday)) return "Hier";
  return date.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "long",
  });
}

/**
 * Client component pour afficher l'heure de session.
 * Doit être côté client pour utiliser le timezone du navigateur de l'utilisateur,
 * pas le timezone du serveur.
 */
export function SessionTimeDisplay({
  startTime,
  endTime,
}: {
  startTime: string | null;
  endTime: string | null;
}) {
  const startDate = startTime ? new Date(startTime) : null;
  const endDate = endTime ? new Date(endTime) : null;

  const timeLabel =
    startDate && endDate
      ? `${sessionDateLabel(startDate)} ${formatTimeRange(startDate, endDate)}`
      : startDate
        ? sessionDateLabel(startDate)
        : null;

  if (!timeLabel) return null;

  return (
    <>
      <span className="text-[var(--color-muted)]/30">·</span>
      <span className="text-[var(--color-muted)]">{timeLabel}</span>
    </>
  );
}
