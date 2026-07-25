import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

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
      console.error("Failed to auto-close group:", error.message);
    }
  }

  return false;
}
