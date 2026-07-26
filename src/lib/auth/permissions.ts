import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export type BusinessRole = "owner" | "admin" | "employee";

export function isBusinessRole(value: string | null | undefined): value is BusinessRole {
  return value === "owner" || value === "admin" || value === "employee";
}

export type Capability =
  | "manage_billing"
  | "edit_business_info"
  | "manage_members"
  | "invite_employees"
  | "manage_waivers"
  | "manage_groups"
  | "view_stats"
  /** Read signer PII in the dashboard (search, detail, single PDF). */
  | "view_submissions"
  /** Bulk extraction of signer PII (CSV / ZIP). Deliberately not granted to
   *  employees: day-to-day signing never needs to download the whole roster. */
  | "export_data"
  /** Erase a signer's data on request (GDPR art. 17). */
  | "delete_submission"
  | "sign_customers"
  /** Hand the owner seat to another member — owner only. */
  | "transfer_ownership";

/** Add a role or capability here — nothing else needs to change to extend access control. */
const ROLE_CAPABILITIES: Record<BusinessRole, readonly Capability[]> = {
  owner: [
    "manage_billing",
    "edit_business_info",
    "manage_members",
    "invite_employees",
    "manage_waivers",
    "manage_groups",
    "view_stats",
    "view_submissions",
    "export_data",
    "delete_submission",
    "sign_customers",
    "transfer_ownership",
  ],
  admin: [
    "invite_employees",
    "manage_members",
    "manage_waivers",
    "manage_groups",
    "view_stats",
    "view_submissions",
    "export_data",
    "delete_submission",
    "sign_customers",
  ],
  // Day-to-day métier: see who signed / open a PDF, never export or erase bulk.
  employee: ["sign_customers", "view_submissions"],
};

export function hasCapability(role: BusinessRole, capability: Capability): boolean {
  return ROLE_CAPABILITIES[role].includes(capability);
}

export type BusinessContext = {
  businessId: string;
  role: BusinessRole;
};

/**
 * Resolve a user's active membership for ONE specific business.
 *
 * Single implementation of this lookup — `isActiveMember` used to duplicate it
 * in lib/auth/membership.ts. Pass `userId` when the caller already has the
 * authenticated user to skip a redundant `auth.getUser()` round-trip.
 *
 * Returns null when unauthenticated or not an active member. RLS already
 * blocks the underlying data; this lets the app branch cleanly before querying.
 */
export async function getBusinessContext(
  supabase: SupabaseClient<Database>,
  businessId: string,
  userId?: string,
): Promise<BusinessContext | null> {
  let resolvedUserId = userId;
  if (!resolvedUserId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    resolvedUserId = user.id;
  }

  const { data } = await supabase
    .from("business_member")
    .select("role")
    .eq("business_id", businessId)
    .eq("user_id", resolvedUserId)
    .eq("status", "active")
    .maybeSingle();

  if (!data || !isBusinessRole(data.role)) return null;
  return { businessId, role: data.role };
}

/**
 * Guard for server actions / route handlers: throws when the caller doesn't
 * hold the given capability for the business. RLS is the real boundary —
 * this is the second layer that turns a silent RLS-empty-result into a
 * clear, intentional rejection before any write is attempted.
 */
export async function requireCapability(
  supabase: SupabaseClient<Database>,
  businessId: string,
  capability: Capability,
): Promise<BusinessContext> {
  const ctx = await getBusinessContext(supabase, businessId);
  if (!ctx || !hasCapability(ctx.role, capability)) {
    throw new Error("Accès refusé pour ce rôle.");
  }
  return ctx;
}
