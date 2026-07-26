import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { isBusinessRole, type BusinessContext } from "./permissions";

type DbClient = SupabaseClient<Database>;

/** Find the current user's active membership, if any (no invite claim). */
export async function getActiveMembership(
  supabase: DbClient,
  userId: string,
): Promise<BusinessContext | null> {
  // A user can belong to more than one business. Until a real switcher exists,
  // prefer an owned business (most recently created), else the newest membership.
  // Picking an arbitrary "latest" row used to route owners into a guest tenant.
  const { data } = await supabase
    .from("business_member")
    .select("business_id, role, created_at")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  const rows = data ?? [];
  const owned = rows.find((row) => row.role === "owner");
  const picked = owned ?? rows[0];
  if (!picked || !isBusinessRole(picked.role)) return null;
  return { businessId: picked.business_id, role: picked.role };
}

/**
 * Check active membership for one specific business (not "whichever business
 * the user belongs to"). Use this when the caller already knows the target
 * business_id — e.g. from a resource being accessed — since a user can
 * belong to several businesses and this pins the check to the right one.
 */
export async function isActiveMember(
  supabase: DbClient,
  userId: string,
  businessId: string,
): Promise<BusinessContext | null> {
  const { data } = await supabase
    .from("business_member")
    .select("role")
    .eq("user_id", userId)
    .eq("business_id", businessId)
    .eq("status", "active")
    .maybeSingle();

  if (!data || !isBusinessRole(data.role)) return null;
  return { businessId, role: data.role };
}

/**
 * Attach every pending invite for this email to the authenticated user.
 * Safe to call on every login. RLS (business_member_claim_own_invite) is the
 * real boundary — this only sets user_id to the caller's own id.
 */
export async function claimPendingInvite(
  supabase: DbClient,
  userId: string,
  email: string | null | undefined,
): Promise<number> {
  const normalizedEmail = email?.trim().toLowerCase();
  if (!normalizedEmail) return 0;

  const { data, error } = await supabase
    .from("business_member")
    .update({ user_id: userId, status: "active" })
    .eq("invited_email", normalizedEmail)
    .eq("status", "invited")
    .is("user_id", null)
    .select("id");

  if (error) {
    console.error("claimPendingInvite failed:", error.message);
    return 0;
  }
  return data?.length ?? 0;
}

/**
 * Resolve which business the current user should land on: claim any pending
 * invites first, then pick an active membership. Null means a genuinely new
 * user with no business yet.
 */
export async function resolveBusinessContext(
  supabase: DbClient,
  userId: string,
  email: string | null | undefined,
): Promise<BusinessContext | null> {
  // Always claim first — otherwise an existing owner membership would skip a
  // pending invite to a second business forever.
  await claimPendingInvite(supabase, userId, email);
  return getActiveMembership(supabase, userId);
}
