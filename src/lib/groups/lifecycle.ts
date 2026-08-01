import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { logError } from "@/lib/observability/log";

type DbClient = SupabaseClient<Database>;

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

  // Past deadline while still marked open — close it.
  if (group.status === "open" && group.closes_at) {
    const { error } = await client
      .from("signing_group")
      .update({ status: "closed" })
      .eq("id", group.id)
      .eq("status", "open");
    if (error) {
      logError("group.auto_close_failed", error.message, { groupId: group.id });
    }
  }

  return false;
}
