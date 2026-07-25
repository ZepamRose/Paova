import {
  WEEKDAY_LABELS_FR,
  formatTimeFr,
  normalizeTimeInput,
  type ExpirationMode,
  type SignatureHoursConfig,
} from "@/lib/templates";

function formatDaysRange(days: number[]): string {
  const sorted = [...new Set(days)].filter((d) => d >= 1 && d <= 7).sort((a, b) => a - b);
  if (sorted.length === 0 || sorted.length === 7) return "Tous les jours";

  let consecutive = sorted.length > 1;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] !== sorted[i - 1] + 1) {
      consecutive = false;
      break;
    }
  }

  const label = (day: number) =>
    WEEKDAY_LABELS_FR.find((w) => w.day === day)?.short ?? String(day);

  if (consecutive) {
    return `${label(sorted[0])} → ${label(sorted[sorted.length - 1])}`;
  }
  return sorted.map(label).join(", ");
}

function formatClock(value: string | null | undefined): string {
  const normalized = normalizeTimeInput(value);
  if (normalized) {
    const [h, m] = normalized.split(":");
    return `${h}h${m ?? "00"}`;
  }
  const fr = formatTimeFr(value);
  return fr === "—" ? "—" : fr;
}

export function summarizeHours(config: SignatureHoursConfig): {
  primary: string;
  secondary?: string;
} {
  if (!config.enabled) {
    return { primary: "Toujours ouverte" };
  }
  const start = formatClock(config.start);
  const end = formatClock(config.end);
  if (start === "—" || end === "—") {
    return { primary: "Toujours ouverte" };
  }
  return {
    primary: formatDaysRange(config.days),
    secondary: `${start} → ${end}`,
  };
}

export function summarizeExpiration(opts: {
  mode: ExpirationMode;
  expiresAt: string | null;
  expiresLabel: string | null;
  isExpired: boolean;
}): { primary: string; secondary?: string; tone?: "warning" } {
  if (opts.isExpired) {
    return {
      primary: "Expirée",
      secondary: opts.expiresLabel ? `Depuis le ${opts.expiresLabel}` : undefined,
      tone: "warning",
    };
  }
  if (opts.mode === "none" || !opts.expiresAt) {
    return { primary: "Aucune expiration" };
  }

  const expiresMs = new Date(opts.expiresAt).getTime();
  if (!Number.isNaN(expiresMs)) {
    const daysLeft = Math.ceil((expiresMs - Date.now()) / 86_400_000);
    if (daysLeft <= 0) {
      return {
        primary: "Expirée",
        secondary: opts.expiresLabel ? `Le ${opts.expiresLabel}` : undefined,
        tone: "warning",
      };
    }
    if (daysLeft <= 30) {
      return {
        primary: `Expire dans ${daysLeft} j`,
        secondary: opts.expiresLabel ? `Le ${opts.expiresLabel}` : undefined,
      };
    }
  }

  return {
    primary: opts.expiresLabel
      ? `Expire le ${opts.expiresLabel}`
      : "Expiration planifiée",
  };
}
