import type { User } from "@supabase/supabase-js";
import type { BusinessContext, BusinessRole } from "./permissions";

function isRole(value: string): value is BusinessRole {
  return value === "owner" || value === "admin" || value === "employee";
}

/** Normalize and collect every email address attached to the auth user. */
export function emailsForAuthUser(
  user: Pick<User, "email" | "identities">,
): string[] {
  const emails = new Set<string>();
  const primary = user.email?.trim().toLowerCase();
  if (primary) emails.add(primary);
  for (const identity of user.identities ?? []) {
    const raw = identity.identity_data?.email;
    if (typeof raw === "string" && raw.trim()) {
      emails.add(raw.trim().toLowerCase());
    }
  }
  return [...emails];
}

/**
 * Choose which active seat the app should use when a user belongs to several
 * businesses. Collaborator/admin seats win over an accidental solo-owner
 * workspace created before an invite was claimed.
 */
export function pickPreferredMembership(
  rows: readonly { business_id: string; role: string }[],
): BusinessContext | null {
  if (rows.length === 0) return null;

  const owned = rows.find((row) => row.role === "owner");
  const collaborator = rows.find(
    (row) => row.role === "admin" || row.role === "employee",
  );

  const picked = collaborator ?? owned ?? rows[0];
  if (!picked || !isRole(picked.role)) return null;
  return { businessId: picked.business_id, role: picked.role };
}
