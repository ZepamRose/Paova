import type { User, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { logError } from "@/lib/observability/log";
import { isBusinessRole, type BusinessContext } from "./permissions";
import {
  emailsForAuthUser,
  pickPreferredMembership,
} from "./membership-select";
import { getActiveBusinessId } from "./active-business";

export { emailsForAuthUser, pickPreferredMembership } from "./membership-select";

type DbClient = SupabaseClient<Database>;

/** List every active seat for the user (newest first). */
export async function listActiveMemberships(
  supabase: DbClient,
  userId: string,
): Promise<BusinessContext[]> {
  const { data } = await supabase
    .from("business_member")
    .select("business_id, role, created_at")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  const out: BusinessContext[] = [];
  for (const row of data ?? []) {
    if (!isBusinessRole(row.role)) continue;
    out.push({ businessId: row.business_id, role: row.role });
  }
  return out;
}

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

  const pinned = await getActiveBusinessId();
  return pickPreferredMembership(data ?? [], pinned);
}

/**
 * True when at least one pending invite still targets one of these emails.
 * Used to block accidental solo-owner onboarding while an invite is open.
 */
export async function hasPendingInviteForEmails(
  emailOrUser: string | null | undefined | Pick<User, "email" | "identities">,
): Promise<boolean> {
  const emails =
    emailOrUser && typeof emailOrUser === "object"
      ? emailsForAuthUser(emailOrUser)
      : emailOrUser?.trim()
        ? [emailOrUser.trim().toLowerCase()]
        : [];
  if (emails.length === 0) return false;

  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("business_member")
    .select("id")
    .eq("status", "invited")
    .in("invited_email", emails)
    .limit(1);

  if (error) {
    logError("invite.pending_check_failed", error.message, {
      emailCount: emails.length,
    });
    // Fail closed: do not let onboarding invent an owner space while unsure.
    return true;
  }
  return (data?.length ?? 0) > 0;
}

/**
 * Attach every pending invite for these emails to the authenticated user.
 * Service role bypasses RLS; we still only touch rows whose invited_email
 * matches one of the caller's emails (normalized lowercase at insert).
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

  // Filter on invited_email in SQL. Emails are lowercased on invite insert
  // and by trigger 0041; `.in()` stays indexed and avoids a global scan.
  //
  // No user_id predicate: an `invited` row addressed to one of this user's
  // emails is theirs to claim, whether unlinked or stuck half-claimed.
  const { data, error } = await admin
    .from("business_member")
    .update({ user_id: userId, status: "active" })
    .in("invited_email", emails)
    .eq("status", "invited")
    .select("id");

  if (error) {
    logError("invite.claim_failed", error.message, {
      userId,
      emailCount: emails.length,
    });
    return 0;
  }
  return data?.length ?? 0;
}

/**
 * Resolve which business the current user should land on: claim any pending
 * invites first, then pick an active membership (honouring the active-business
 * cookie). Null means a genuinely new user with no business yet.
 */
export async function resolveBusinessContext(
  supabase: DbClient,
  userId: string,
  emailOrUser: string | null | undefined | Pick<User, "email" | "identities">,
): Promise<BusinessContext | null> {
  // Always claim first. Skipping for existing admin/employee seats left
  // subsequent invites stuck on `invited` forever (multi-tenant join).
  await claimPendingInvite(supabase, userId, emailOrUser);
  return getActiveMembership(supabase, userId);
}
