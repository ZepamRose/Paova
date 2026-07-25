/**
 * Recurring opening hours for public signatures.
 * Independent from status (open/inactive) and expiration.
 */

export type SignatureHoursConfig = {
  enabled: boolean;
  timezone: string;
  /** "HH:MM" or "HH:MM:SS" */
  start: string | null;
  end: string | null;
  /** ISO weekdays 1=Mon … 7=Sun */
  days: number[];
};

export const SIGNATURE_TIMEZONES = [
  { id: "Europe/Paris", label: "Europe/Paris (France)" },
  { id: "Europe/Brussels", label: "Europe/Bruxelles (Belgique)" },
  { id: "Europe/Zurich", label: "Europe/Zurich (Suisse)" },
  { id: "Europe/Luxembourg", label: "Europe/Luxembourg" },
  { id: "Europe/Madrid", label: "Europe/Madrid" },
  { id: "Atlantic/Canary", label: "Atlantic/Canary" },
  { id: "America/Martinique", label: "Amérique/Martinique" },
  { id: "America/Guadeloupe", label: "Amérique/Guadeloupe" },
  { id: "Indian/Reunion", label: "Océan Indien/Réunion" },
  { id: "UTC", label: "UTC" },
] as const;

export const WEEKDAY_LABELS_FR: { day: number; short: string; long: string }[] =
  [
    { day: 1, short: "Lun", long: "Lundi" },
    { day: 2, short: "Mar", long: "Mardi" },
    { day: 3, short: "Mer", long: "Mercredi" },
    { day: 4, short: "Jeu", long: "Jeudi" },
    { day: 5, short: "Ven", long: "Vendredi" },
    { day: 6, short: "Sam", long: "Samedi" },
    { day: 7, short: "Dim", long: "Dimanche" },
  ];

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/;

export function parseTimeToMinutes(value: string | null | undefined): number | null {
  if (!value) return null;
  const m = TIME_RE.exec(value.trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

export function normalizeTimeInput(value: string | null | undefined): string | null {
  const mins = parseTimeToMinutes(value);
  if (mins === null) return null;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function isValidTimezone(value: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

function weekdayIsoInZone(now: Date, timeZone: string): number {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(now);
  const map: Record<string, number> = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 7,
  };
  return map[weekday] ?? 1;
}

function minutesInZone(now: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return hour * 60 + minute;
}

function isTimeInWindow(
  nowMinutes: number,
  startMinutes: number,
  endMinutes: number,
): boolean {
  if (startMinutes === endMinutes) {
    // Same start/end = 24h open on selected days
    return true;
  }
  if (startMinutes < endMinutes) {
    return nowMinutes >= startMinutes && nowMinutes < endMinutes;
  }
  // Overnight window (e.g. 22:00 → 02:00)
  return nowMinutes >= startMinutes || nowMinutes < endMinutes;
}

/** When hours are disabled or incomplete, treat as always open (no schedule gate). */
export function isWithinSignatureHours(
  config: SignatureHoursConfig,
  now: Date = new Date(),
): boolean {
  if (!config.enabled) return true;
  const start = parseTimeToMinutes(config.start);
  const end = parseTimeToMinutes(config.end);
  if (start === null || end === null) return true;
  if (!config.timezone || !isValidTimezone(config.timezone)) return true;

  const days =
    config.days.length > 0
      ? config.days
      : [1, 2, 3, 4, 5, 6, 7];
  const weekday = weekdayIsoInZone(now, config.timezone);
  if (!days.includes(weekday)) return false;

  return isTimeInWindow(minutesInZone(now, config.timezone), start, end);
}

export function formatTimeFr(value: string | null | undefined): string {
  const mins = parseTimeToMinutes(value);
  if (mins === null) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, "0")}`;
}

export function formatSignatureHoursSummary(
  config: SignatureHoursConfig,
): string | null {
  if (!config.enabled) return null;
  const start = formatTimeFr(config.start);
  const end = formatTimeFr(config.end);
  if (start === "—" || end === "—") return null;

  const days = [...config.days].sort((a, b) => a - b);
  const allDays = days.length === 7;
  const daysLabel = allDays
    ? "tous les jours"
    : days
        .map(
          (d) =>
            WEEKDAY_LABELS_FR.find((w) => w.day === d)?.short ?? String(d),
        )
        .join(", ");

  return `${daysLabel} · ${start}–${end} (${config.timezone})`;
}

export function signatureHoursClosedMessage(
  config: SignatureHoursConfig,
): string {
  const summary = formatSignatureHoursSummary(config);
  if (!summary) {
    return "Les signatures sont temporairement fermées (hors horaires d'ouverture).";
  }
  return `Hors horaires d'ouverture. Signatures acceptées : ${summary}.`;
}

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  weekday: number;
  minutes: number;
};

function zonedParts(now: Date, timeZone: string): ZonedParts {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hourCycle: "h23",
  }).formatToParts(now);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "0";

  const weekdayMap: Record<string, number> = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 7,
  };

  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    weekday: weekdayMap[get("weekday")] ?? 1,
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

/** Human hint like "aujourd'hui à 9h" / "demain à 9h" / "lundi à 9h". */
export function describeNextSignatureOpen(
  config: SignatureHoursConfig,
  now: Date = new Date(),
): string | null {
  if (!config.enabled || !isValidTimezone(config.timezone)) return null;
  const start = parseTimeToMinutes(config.start);
  const end = parseTimeToMinutes(config.end);
  if (start === null || end === null) return null;

  const days =
    config.days.length > 0 ? config.days : [1, 2, 3, 4, 5, 6, 7];
  const today = zonedParts(now, config.timezone);
  const timeLabel = formatTimeFr(config.start);

  for (let offset = 0; offset < 8; offset++) {
    const weekday = ((today.weekday - 1 + offset) % 7) + 1;
    if (!days.includes(weekday)) continue;

    if (offset === 0) {
      if (start === end) {
        // 24h on this day — if somehow closed, next day
        continue;
      }
      if (start < end) {
        // Same-day window: before opening → today
        if (today.minutes < start) {
          return `aujourd'hui à ${timeLabel}`;
        }
        continue;
      }
      // Overnight: closed in the afternoon gap before evening open
      if (today.minutes >= end && today.minutes < start) {
        return `aujourd'hui à ${timeLabel}`;
      }
      continue;
    }

    if (offset === 1) {
      return `demain à ${timeLabel}`;
    }
    const long =
      WEEKDAY_LABELS_FR.find((w) => w.day === weekday)?.long?.toLowerCase() ??
      "";
    return `${long} à ${timeLabel}`;
  }

  return `à ${timeLabel}`;
}

export type SignatureHoursClosedCopy = {
  eyebrow: string;
  title: string;
  body: string;
  meta: string | null;
};

export function signatureHoursClosedCopy(
  config: SignatureHoursConfig,
  now: Date = new Date(),
): SignatureHoursClosedCopy {
  const next = describeNextSignatureOpen(config, now);
  const summary = formatSignatureHoursSummary(config);

  return {
    eyebrow: "Hors horaires",
    title: next ? `Revenez ${next}` : "Les signatures sont fermées pour le moment",
    body: next
      ? "Ce n'est pas l'heure d'ouverture pour signer cette décharge. Revenez un peu plus tard — rien à faire de votre côté."
      : "Les signatures ne sont pas acceptées pour le moment. Merci de revenir pendant les horaires d'ouverture.",
    meta: summary ? `Horaires habituels : ${summary}` : null,
  };
}

export function configFromTemplateRow(row: {
  signature_hours_enabled?: boolean | null;
  signature_timezone?: string | null;
  signature_hours_start?: string | null;
  signature_hours_end?: string | null;
  signature_hours_days?: number[] | null;
}): SignatureHoursConfig {
  const days = Array.isArray(row.signature_hours_days)
    ? row.signature_hours_days.filter((d) => d >= 1 && d <= 7)
    : [1, 2, 3, 4, 5, 6, 7];

  return {
    enabled: Boolean(row.signature_hours_enabled),
    timezone: row.signature_timezone || "Europe/Paris",
    start: normalizeTimeInput(row.signature_hours_start) ?? "09:00",
    end: normalizeTimeInput(row.signature_hours_end) ?? "19:00",
    days: days.length > 0 ? days : [1, 2, 3, 4, 5, 6, 7],
  };
}
