"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Heartbeat hook — updates last_seen_at every 2 minutes while the user
 * is actively using the dashboard.
 *
 * Usage: call once at the top of the dashboard layout or any page where
 * you want to track activity.
 */
export function useActivityHeartbeat(businessId: string | null | undefined) {
  useEffect(() => {
    if (!businessId) return;

    const supabase = createClient();

    async function sendHeartbeat() {
      try {
        await supabase.rpc("update_member_activity", {
          p_business_id: businessId!,
        });
      } catch {
        // Silent fail — don't interrupt the user experience if heartbeat fails
      }
    }

    // Send immediately on mount (user just navigated to this page)
    void sendHeartbeat();

    // Then every 2 minutes
    const intervalId = setInterval(() => {
      void sendHeartbeat();
    }, 2 * 60 * 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [businessId]);
}
