/**
 * PAOVA V2 - Smart Time Formatting
 * 
 * Formatage intelligent du temps relatif.
 * Affiche uniquement les unités pertinentes selon la durée.
 */

// ─── Constants ───────────────────────────────────────────────────────────────

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

// ─── Smart Countdown Formatting ──────────────────────────────────────────────

export type CountdownFormat = {
  text: string;
  showSeconds: boolean; // Pour savoir si on doit rafraîchir chaque seconde
};

/**
 * Formate un compte à rebours de manière intelligente.
 * 
 * Règles :
 * - < 1 min    → "42 s"
 * - < 1 h      → "12 min 43 s"
 * - < 24 h     → "2 h 43"
 * - < 7 j      → "2 j 5 h"
 * - ≥ 7 j      → null (utiliser formatFutureDate à la place)
 */
export function formatSmartCountdown(ms: number, prefix: string = "dans"): CountdownFormat | null {
  if (ms < 0) {
    return { text: "maintenant", showSeconds: false };
  }

  // Plus de 7 jours : ne pas afficher de countdown
  if (ms >= WEEK) {
    return null;
  }

  const totalSeconds = Math.floor(ms / SECOND);
  const days = Math.floor(ms / DAY);
  const hours = Math.floor((ms % DAY) / HOUR);
  const minutes = Math.floor((ms % HOUR) / MINUTE);
  const seconds = totalSeconds % 60;

  // Moins d'1 minute : afficher uniquement les secondes
  if (ms < MINUTE) {
    return {
      text: `${prefix} ${seconds} s`,
      showSeconds: true,
    };
  }

  // Moins d'1 heure : minutes + secondes
  if (ms < HOUR) {
    return {
      text: `${prefix} ${minutes} min ${seconds} s`,
      showSeconds: true,
    };
  }

  // Moins de 24 heures : heures + minutes (sans secondes)
  if (ms < DAY) {
    return {
      text: `${prefix} ${hours} h ${String(minutes).padStart(2, "0")}`,
      showSeconds: false,
    };
  }

  // Entre 1 et 7 jours : jours + heures
  return {
    text: `${prefix} ${days} j ${hours} h`,
    showSeconds: false,
  };
}

// ─── Future Date Formatting ──────────────────────────────────────────────────

/**
 * Formate une date future de manière élégante.
 * Utilisé quand le countdown est trop long (> 7 jours).
 * 
 * Exemples :
 * - "Vendredi • 09:30"
 * - "12 août • 14:00"
 */
export function formatFutureDate(date: Date): string {
  const now = new Date();
  const diffDays = Math.floor((date.getTime() - now.getTime()) / DAY);

  // Formater l'heure
  const timeStr = date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Si dans les 7 prochains jours : afficher le jour de la semaine
  if (diffDays < 7) {
    const dayName = date.toLocaleDateString("fr-FR", { weekday: "long" });
    return `${dayName.charAt(0).toUpperCase() + dayName.slice(1)} • ${timeStr}`;
  }

  // Sinon : afficher la date
  const dateStr = date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
  });
  return `${dateStr} • ${timeStr}`;
}

// ─── Elapsed Time Formatting ─────────────────────────────────────────────────

/**
 * Formate le temps écoulé depuis le début d'une session.
 * 
 * Règles :
 * - < 1 h      → "depuis 18 min"
 * - < 24 h     → "depuis 3 h"
 * - 1 jour     → "depuis hier"
 * - 2+ jours   → "depuis 2 jours"
 */
export function formatElapsedTime(ms: number): string {
  if (ms < 0) {
    return "depuis maintenant";
  }

  // Moins d'1 heure : afficher les minutes
  if (ms < HOUR) {
    const minutes = Math.floor(ms / MINUTE);
    return `depuis ${minutes} min`;
  }

  // Moins de 24 heures : afficher les heures
  if (ms < DAY) {
    const hours = Math.floor(ms / HOUR);
    return `depuis ${hours} h`;
  }

  // Exactement 1 jour (24h à 48h)
  if (ms < 2 * DAY) {
    return "depuis hier";
  }

  // 2 jours ou plus
  const days = Math.floor(ms / DAY);
  return `depuis ${days} jours`;
}

// ─── Smart Relative Time (All-in-one) ───────────────────────────────────────

export type RelativeTimeFormat = {
  text: string;
  showSeconds: boolean;
  useDate: boolean; // Si true, ignorer le countdown et afficher la date
};

/**
 * Fonction principale : détermine automatiquement le meilleur format.
 * 
 * @param startTime - Date de début de la session
 * @param endTime - Date de fin de la session (optionnel)
 * @param now - Date actuelle (timestamp)
 * @param context - "upcoming" | "ongoing" | "ending"
 */
export function formatSmartRelativeTime(
  startTime: Date | null,
  endTime: Date | null,
  now: number,
  context: "upcoming" | "ongoing" | "ending"
): RelativeTimeFormat {
  if (!startTime) {
    return { text: "", showSeconds: false, useDate: false };
  }

  const startMs = startTime.getTime();
  const endMs = endTime?.getTime();

  // Session à venir (pas encore commencée)
  if (context === "upcoming" && now < startMs) {
    const remainingMs = startMs - now;

    // Si > 7 jours : afficher la date au lieu du countdown
    if (remainingMs >= WEEK) {
      return {
        text: formatFutureDate(startTime),
        showSeconds: false,
        useDate: true,
      };
    }

    // Sinon : countdown intelligent
    const formatted = formatSmartCountdown(remainingMs, "Débute dans");
    if (formatted) {
      return { ...formatted, useDate: false };
    }
  }

  // Session en cours
  if (context === "ongoing") {
    const elapsedMs = now - startMs;
    return {
      text: `En cours • ${formatElapsedTime(elapsedMs)}`,
      showSeconds: false,
      useDate: false,
    };
  }

  // Fin de session approchante
  if (context === "ending" && endMs) {
    const remainingMs = endMs - now;

    if (remainingMs <= 0) {
      return { text: "Terminée", showSeconds: false, useDate: false };
    }

    const formatted = formatSmartCountdown(remainingMs, "Fin dans");
    if (formatted) {
      return { ...formatted, useDate: false };
    }
  }

  return { text: "", showSeconds: false, useDate: false };
}
