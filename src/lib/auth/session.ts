import { cache } from "react";
import { redirect } from "next/navigation";
import type { User, SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import {
  resolveBusinessContext,
} from "@/lib/auth/membership";
import {
  getBusinessContext,
  hasCapability,
  requireCapability,
  type BusinessContext,
  type Capability,
} from "@/lib/auth/permissions";
import type { Database } from "@/types/database.types";

export type DashboardSession = {
  supabase: SupabaseClient<Database>;
  user: User;
  membership: BusinessContext;
};

/**
 * Single entry point for dashboard pages: auth + claim invites + membership.
 * Cached per request so layout + page share one resolution.
 */
export const getDashboardSession = cache(
  async (): Promise<DashboardSession> => {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      redirect("/login");
    }

    const membership = await resolveBusinessContext(supabase, user.id, user);
    if (!membership) {
      redirect("/onboarding");
    }

    return { supabase, user, membership };
  },
);

/** Page guard: redirect home when the membership role lacks the capability. */
export async function requireDashboardCapability(
  capability: Capability,
): Promise<DashboardSession> {
  const session = await getDashboardSession();
  if (!hasCapability(session.membership.role, capability)) {
    redirect("/dashboard");
  }
  return session;
}

/**
 * Server-action guard: claim invites, then enforce capability.
 * Pass businessId when the form targets a specific tenant.
 */
export async function requireActionCapability(
  capability: Capability,
  businessId?: string,
): Promise<DashboardSession> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const membership = await resolveBusinessContext(supabase, user.id, user);
  if (!membership) {
    redirect("/onboarding");
  }

  const targetId = businessId ?? membership.businessId;
  try {
    await requireCapability(supabase, targetId, capability);
  } catch {
    redirect("/dashboard");
  }

  if (targetId === membership.businessId) {
    return { supabase, user, membership };
  }

  const pinned = await getBusinessContext(supabase, targetId);
  if (!pinned) {
    redirect("/dashboard");
  }
  return { supabase, user, membership: pinned };
}
