"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Keep team activity status fresh while the members page is open.
 * 
 * Listens to UPDATE events on business_member.last_seen_at and refreshes
 * the page to show real-time "En ligne" status changes.
 * 
 * Fallback: light polling every 30s if Realtime isn't ready.
 */
export function useLiveMemberActivityRefresh(businessId: string) {
  const router = useRouter();

  useEffect(() => {
    if (!businessId) return;

    const supabase = createClient();
    let debounceTimer: number | null = null;
    let realtimeReady = false;
    let busy = false;

    const trigger = () => {
      if (document.visibilityState !== "visible") return;
      if (debounceTimer != null) window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(() => {
        debounceTimer = null;
        if (busy) return;
        busy = true;
        try {
          router.refresh();
        } finally {
          window.setTimeout(() => {
            busy = false;
          }, 2_000);
        }
      }, 800);
    };

    const channel = supabase
      .channel(`live-member-activity:${businessId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "business_member",
          filter: `business_id=eq.${businessId}`,
        },
        (payload) => {
          // Only refresh if last_seen_at changed (ignore other updates like role changes)
          if (payload.new && "last_seen_at" in payload.new) {
            trigger();
          }
        },
      )
      .subscribe((status) => {
        realtimeReady = status === "SUBSCRIBED";
      });

    const onVisible = () => {
      if (document.visibilityState === "visible") trigger();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    // Fallback polling if Realtime isn't enabled
    const pollId = window.setInterval(() => {
      if (!realtimeReady && document.visibilityState === "visible") {
        trigger();
      }
    }, 30_000);

    return () => {
      if (debounceTimer != null) window.clearTimeout(debounceTimer);
      window.clearInterval(pollId);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      void supabase.removeChannel(channel);
    };
  }, [businessId, router]);
}
