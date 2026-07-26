import type { User, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { isBusinessRole, type BusinessContext } from "./permissions";
import {
  emailsForAuthUser,
  pickPreferredMembership,
} from "./membership-select";

export { emailsForAuthUser, pickPreferredMembership } from "./membership-select";

type DbClient = SupabaseClient<Database>;

/** Find the current user's active membership, if any (no invite claim). */
export async function getActiveMembership(
  supabase: DbClient,
  userId: string,
): Promise<BusinessContext | null> {
  const { data } = await supabase
    .from("business_member")
    .select("business_id, role, created_at")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  return pickPreferredMembership(data ?? []);
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
 * Attach every pending invite for these emails to the authenticated user.
 * Service role bypasses RLS; we still only touch rows whose invited_email
 * matches one of the caller's emails (case-insensitive).
 */
export async function claimPendingInvite(
  _supabase: DbClient,
  userId: string,
  emailOrUser: string | null | undefined | Pick<User, "email" | "identities">,
): Promise<number> {
  const emails =
    emailOrUser && typeof emailOrUser === "object"
      ? emailsForAuthUser(emailOrUser)
      : emailOrUser?.trim()
        ? [emailOrUser.trim().toLowerCase()]
        : [];
  if (emails.length === 0) return 0;

  const admin = createServiceRoleClient();
  // Include rows already linked to this user but still stuck on `invited`
  // (partial claim), plus classic open invites (user_id IS NULL).
  const { data: pending, error: listError } = await admin
    .from("business_member")
    .select("id, invited_email, user_id")
    .eq("status", "invited")
    .or(`user_id.is.null,user_id.eq.${userId}`);

  if (listError) {
    console.error("claimPendingInvite list failed:", listError.message);
    return 0;
  }

  const ids = (pending ?? [])
    .filter((row) => {
      const invited = row.invited_email?.trim().toLowerCase();
      return invited != null && emails.includes(invited);
    })
    .map((row) => row.id);

  if (ids.length === 0) return 0;

  const { data, error } = await admin
    .from("business_member")
    .update({ user_id: userId, status: "active" })
    .in("id", ids)
    .eq("status", "invited")
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
  emailOrUser: string | null | undefined | Pick<User, "email" | "identities">,
): Promise<BusinessContext | null> {
  await claimPendingInvite(supabase, userId, emailOrUser);
  return getActiveMembership(supabase, userId);
}
