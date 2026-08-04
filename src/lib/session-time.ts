/**
 * PAOVA V2 - Session Time Utilities
 *
 * Utilitaires pour gérer les informations temporelles des sessions.
 */

// ─── Session phase ────────────────────────────────────────────────────────────

/**
 * Les 5 états d'une session, dans l'ordre chronologique.
 *
 * - preparing  : start_time est dans le futur (ou non défini, session ouverte)
 * - active     : entre start_time et end_time (ou ouverte sans contrainte temporelle)
 * - completing : < 10 min avant end_time avec des participants non-signés
 * - done       : clôturée manuellement, tous signés, ou end_time dépassé
 * - archived   : archivée, lecture seule
 */
export type SessionPhase =
  | "preparing"
  | "active"
  | "completing"
  | "done"
  | "archived";

/**
 * Calcule la phase d'une session à partir de son état DB et de ses timestamps.
 * Conçu pour être appelé aussi bien côté serveur (render initial) que côté
 * client (mise à jour en temps réel via setInterval).
 */
export function computeSessionPhase(
  dbStatus: string,
  startTime: string | null,
  endTime: string | null,
  allSigned: boolean,
): SessionPhase {
  if (dbStatus === "archived") return "archived";
  if (dbStatus === "closed") return "done";

  const now = Date.now();

  if (startTime) {
    const start = new Date(startTime).getTime();
    if (start > now) return "preparing";
  }

  if (endTime) {
    const end = new Date(endTime).getTime();
    if (now >= end) return "done";
    const remainingMs = end - now;
    const COMPLETING_THRESHOLD_MS = 10 * 60 * 1000; // 10 min
    if (remainingMs < COMPLETING_THRESHOLD_MS && !allSigned) return "completing";
  }

  return "active";
}

/**
 * Formate un nombre de millisecondes en texte lisible pour un countdown.
 * - ≥ 1h   → "2h30"
 * - ≥ 5min → "34 min"
 * - < 5min → "4:52"  (minutes:secondes — zone critique)
 */
export function formatCountdown(ms: number): string {
  if (ms <= 0) return "0 min";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h${String(minutes).padStart(2, "0")}`;
  }
  if (minutes >= 5) {
    return `${minutes} min`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

// ─── Session time info ────────────────────────────────────────────────────────

export type SessionTimeInfo = {
  startTime: Date | null;
  endTime: Date | null;
  durationMinutes: number | null;
  isOngoing: boolean;
  isUpcoming: boolean;
  isPast: boolean;
  timeUntilStart: number | null; // ms
  timeUntilEnd: number | null; // ms
};

export function getSessionTimeInfo(
  startTime: string | null,
  endTime: string | null,
  durationMinutes: number | null
): SessionTimeInfo {
  const now = new Date();
  const start = startTime ? new Date(startTime) : null;

  // Si end_time est absent mais que start_time et duration_minutes existent,
  // calculer automatiquement la fin de session
  let end: Date | null = null;
  if (endTime) {
    end = new Date(endTime);
  } else if (start && durationMinutes && durationMinutes > 0) {
    end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  }

  const isOngoing = !!(start && end && now >= start && now <= end);
  const isUpcoming = !!(start && now < start);
  const isPast = !!(end && now > end);

  return {
    startTime: start,
    endTime: end,
    durationMinutes,
    isOngoing,
    isUpcoming,
    isPast,
    timeUntilStart: start ? start.getTime() - now.getTime() : null,
    timeUntilEnd: end ? end.getTime() - now.getTime() : null,
  };
}

export function formatSessionTime(date: Date): string {
  return date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatSessionDate(date: Date): string {
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function formatSessionDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h${remainingMinutes.toString().padStart(2, "0")}`;
}

export function formatTimeRange(start: Date, end: Date): string {
  const startTime = formatSessionTime(start);
  const endTime = formatSessionTime(end);
  return `${startTime} - ${endTime}`;
}

export function getTimeUntilText(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `dans ${days} jour${days > 1 ? "s" : ""}`;
  }
  if (hours > 0) {
    return `dans ${hours}h${minutes % 60 > 0 ? (minutes % 60).toString().padStart(2, "0") : ""}`;
  }
  if (minutes > 0) {
    return `dans ${minutes} min`;
  }
  return "dans quelques instants";
}
