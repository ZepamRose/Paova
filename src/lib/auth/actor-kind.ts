import type { BusinessRole } from "./permissions";

/** Map membership role → audit_event.actor_kind (never invent "owner"). */
export function actorKindFromRole(
  role: BusinessRole,
): "owner" | "admin" | "employee" {
  return role;
}
