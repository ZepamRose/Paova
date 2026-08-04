import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { logError } from "@/lib/observability/log";

type DbClient = SupabaseClient<Database>;

// ─── Closing mode ─────────────────────────────────────────────────────────────

/** The four strategies for closing a session. */
export type ClosingMode = "duration" | "business_close" | "fixed_time" | "manual";

export const CLOSING_MODE_LABELS: Record<ClosingMode, string> = {
  duration:       "Après une durée",
  business_close: "À la fermeture de l'établissement",
  fixed_time:     "À une heure précise",
  manual:         "Fermeture manuelle",
};

// ─── Opening hours ─────────────────────────────────────────────────────────────

export type DayHours = { open: string; close: string } | null;

export type OpeningHours = {
  mon: DayHours;
  tue: DayHours;
  wed: DayHours;
  thu: DayHours;
  fri: DayHours;
  sat: DayHours;
  sun: DayHours;
};

const DAY_KEYS: (keyof OpeningHours)[] = [
  "sun", "mon", "tue", "wed", "thu", "fri", "sat",
];

/** Parse an opening_hours JSON value from the database. Returns null if invalid. */
export function parseOpeningHours(raw: unknown): OpeningHours | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const result: Partial<OpeningHours> = {};
  for (const key of DAY_KEYS) {
    const day = obj[key];
    if (!day) { result[key] = null; continue; }
    if (
      typeof day === "object" &&
      !Array.isArray(day) &&
      typeof (day as Record<string, unknown>).open === "string" &&
      typeof (day as Record<string, unknown>).close === "string"
    ) {
      result[key] = {
        open:  (day as Record<string, string>).open,
        close: (day as Record<string, string>).close,
      };
    } else {
      result[key] = null;
    }
  }
  return result as OpeningHours;
}

/**
 * Returns the business closing time (HH:MM) for the given session date,
 * or null if the business is closed or no hours are configured.
 */
export function getBusinessCloseTime(
  openingHours: OpeningHours | null,
  sessionDate: Date,
): string | null {
  if (!openingHours) return null;
  const dayKey = DAY_KEYS[sessionDate.getDay()];
  const hours = openingHours[dayKey];
  return hours ? hours.close : null;
}

/**
 * Compute the concrete end_time ISO string for a session based on its
 * closing mode. Returns null for 'fixed_time' (caller supplies end_time
 * directly) and for 'manual'.
 */
export function resolveEndTime(
  closingMode: ClosingMode,
  startTime: Date,
  durationMinutes: number | null,
  openingHours: OpeningHours | null,
): string | null {
  switch (closingMode) {
    case "duration": {
      if (!durationMinutes || durationMinutes <= 0) return null;
      return new Date(startTime.getTime() + durationMinutes * 60_000).toISOString();
    }
    case "business_close": {
      const closeTime = getBusinessCloseTime(openingHours, startTime);
      if (!closeTime) return null;
      const [h, m] = closeTime.split(":").map(Number);
      const endDate = new Date(startTime);
      endDate.setHours(h, m, 0, 0);
      // Guard: end must be after start
      if (endDate.getTime() <= startTime.getTime()) return null;
      return endDate.toISOString();
    }
    case "fixed_time":
    case "manual":
    default:
      return null;
  }
}

// ─── Group lifecycle ───────────────────────────────────────────────────────────

export type GroupLifecycle = {
  id: string;
  business_id: string;
  status: string;
  closes_at: string | null;
};

/** True when the group can still collect signatures right now. */
export function acceptsGroupSignatures(
  group: Pick<GroupLifecycle, "status" | "closes_at">,
  now: Date = new Date(),
): boolean {
  if (group.status !== "open") return false;
  if (!group.closes_at) return true;
  return new Date(group.closes_at).getTime() > now.getTime();
}

/** Absolute date (YYYY-MM-DD) → end of that UTC day, same as template expiry. */
export function parseClosesOn(raw: string | null | undefined): string | null {
  const value = (raw ?? "").trim();
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return `${value}T23:59:59.999Z`;
}

/**
 * Parse the `<input type="datetime-local">` value of a planned session.
 *
 * The browser hands back wall-clock time with no zone ("2025-10-14T09:30"),
 * which is exactly what the organiser means — 09:30 where the group turns up.
 *
 * CRITICAL: We must parse this as LOCAL time, not UTC.
 * `new Date("2025-10-14T09:30")` interprets it as UTC, which shifts the time
 * by the timezone offset. Instead, we parse the components and construct the
 * Date object explicitly in local time.
 *
 * UPDATE: The client now sends a full ISO timestamp with timezone info,
 * so we can just parse it directly. If it's still in the old format (no timezone),
 * we fall back to the old parsing logic for backward compatibility.
 */
export function parseScheduledAt(raw: string | null | undefined): string | null {
  const value = (raw ?? "").trim();
  if (!value) return null;

  // If the value already contains timezone info (Z or +/-offset), parse directly
  if (value.includes("Z") || /[+-]\d{2}:\d{2}$/.test(value)) {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
  }

  // Legacy: Match ISO datetime format without timezone: YYYY-MM-DDTHH:MM or YYYY-MM-DDTHH:MM:SS
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return null;

  const [, year, month, day, hour, minute, second] = match;

  // Construct Date with local time components (month is 0-indexed)
  const d = new Date(
    parseInt(year, 10),
    parseInt(month, 10) - 1,
    parseInt(day, 10),
    parseInt(hour, 10),
    parseInt(minute, 10),
    second ? parseInt(second, 10) : 0
  );

  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

/** Value for `<input type="datetime-local">` from a stored scheduled_at. */
export function scheduledAtInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Value for `<input type="date">` from a stored closes_at. */
export function closesOnInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export function formatClosesAt(iso: string | null | undefined): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * If an open group is past closes_at, persist status=closed.
 * Returns whether signatures are still accepted after the check.
 */
export async function ensureGroupAccepting(
  client: DbClient,
  group: GroupLifecycle,
): Promise<boolean> {
  if (group.status === "archived" || group.status === "closed") {
    return false;
  }

  if (acceptsGroupSignatures(group)) {
    return true;
  }

  // Past deadline while still marked open — close it and record the real
  // closing timestamp for analytics.
  if (group.status === "open" && group.closes_at) {
    const { error } = await client
      .from("signing_group")
      .update({ status: "closed", closed_at: new Date().toISOString() })
      .eq("id", group.id)
      .eq("status", "open");
    if (error) {
      logError("group.auto_close_failed", error.message, { groupId: group.id });
    }
  }

  return false;
}
