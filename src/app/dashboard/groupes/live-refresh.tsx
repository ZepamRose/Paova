"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Soft refresh so walk-in signatures appear without a full reload.
 * Avoids stacking intervals when `router` identity changes after refresh,
 * and skips work while the tab is hidden or a refresh is already in flight.
 */
export function LiveRefresh({
  enabled,
  intervalMs = 20_000,
}: {
  enabled: boolean;
  intervalMs?: number;
}) {
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;
  const busyRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const tick = () => {
      if (document.visibilityState !== "visible") return;
      if (busyRef.current) return;
      busyRef.current = true;
      try {
        routerRef.current.refresh();
      } finally {
        // Allow the next tick after a short cooldown so RSC work can finish.
        window.setTimeout(() => {
          busyRef.current = false;
        }, Math.min(intervalMs, 8_000));
      }
    };

    const id = window.setInterval(tick, intervalMs);
    return () => window.clearInterval(id);
  }, [enabled, intervalMs]);

  return null;
}
