"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useActivityHeartbeat } from "@/lib/members/use-activity-heartbeat";

/**
 * Global activity heartbeat for the entire dashboard.
 * Fetches the active businessId once on mount, then tracks presence across
 * all dashboard pages (not just /settings/membres).
 */
export function DashboardActivityHeartbeat() {
  const [businessId, setBusinessId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function fetchBusinessId() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get the active business membership from business_member
      const { data } = await supabase
        .from("business_member")
        .select("business_id")
        .eq("user_id", user.id)
        .eq("status", "active")
        .single();

      if (data?.business_id) {
        setBusinessId(data.business_id);
      }
    }

    void fetchBusinessId();
  }, []);

  useActivityHeartbeat(businessId);

  return null;
}
