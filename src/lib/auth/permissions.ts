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
  /** Bulk extraction of signer PII (CSV / ZIP). Deliberately not granted to
   *  employees: day-to-day signing never needs to download the whole roster. */
  | "export_data"
  /** Erase a signer's data on request (GDPR art. 17). */
  | "delete_submission"
  | "sign_customers";

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
    "export_data",
    "delete_submission",
    "sign_customers",
  ],
  admin: [
    "invite_employees",
    "manage_members",
    "manage_waivers",
    "manage_groups",
    "view_stats",
    "export_data",
    "delete_submission",
    "sign_customers",
  ],
  employee: ["sign_customers"],
};

export function hasCapability(role: BusinessRole, capability: Capability): boolean {
  return ROLE_CAPABILITIES[role].includes(capability);
}

export type BusinessContext = {
  businessId: string;
  role: BusinessRole;
};

/**
 * Resolve the current user's active membership for a business.
 * Returns null when unauthenticated or not an active member (RLS would
 * already block the underlying data — this gives the app a clean check to
 * branch on before hitting the database at all).
 */
export async function getBusinessContext(
  supabase: SupabaseClient<Database>,
  businessId: string,
): Promise<BusinessContext | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("business_member")
    .select("role")
    .eq("business_id", businessId)
    .eq("user_id", user.id)
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
