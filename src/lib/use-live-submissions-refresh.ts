"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Keep signature lists fresh while the dashboard is open.
 * Primary: Supabase Realtime INSERT on `submission`.
 * Fallbacks: tab focus + light polling if Realtime isn't subscribed yet.
 */
export function useLiveSubmissionsRefresh(options?: {
  /** Limit events to one waiver; omit for all visible submissions (RLS). */
  templateId?: string | null;
  enabled?: boolean;
  /** Custom refresh (e.g. client-side search refetch). Default: router.refresh(). */
  onRefresh?: () => void;
}) {
  const router = useRouter();
  const onRefreshRef = useRef(options?.onRefresh);
  onRefreshRef.current = options?.onRefresh;

  const enabled = options?.enabled !== false;
  const templateId = options?.templateId ?? null;

  useEffect(() => {
    if (!enabled) return;

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
          if (onRefreshRef.current) onRefreshRef.current();
          else router.refresh();
        } finally {
          window.setTimeout(() => {
            busy = false;
          }, 2_000);
        }
      }, 320);
    };

    const channelName = templateId
      ? `live-submissions:${templateId}`
      : "live-submissions:owner";

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "submission",
          ...(templateId
            ? { filter: `template_id=eq.${templateId}` }
            : {}),
        },
        () => trigger(),
      )
      .subscribe((status) => {
        realtimeReady = status === "SUBSCRIBED";
      });

    const onVisible = () => {
      if (document.visibilityState === "visible") trigger();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    // If Realtime isn't enabled yet (migration pending), still stay roughly fresh.
    const pollId = window.setInterval(() => {
      if (!realtimeReady && document.visibilityState === "visible") {
        trigger();
      }
    }, 20_000);

    return () => {
      if (debounceTimer != null) window.clearTimeout(debounceTimer);
      window.clearInterval(pollId);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      void supabase.removeChannel(channel);
    };
    // router omitted on purpose: identity changes after refresh would restart the channel loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, templateId]);
}

