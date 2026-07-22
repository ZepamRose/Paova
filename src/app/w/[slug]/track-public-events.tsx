"use client";

import { useEffect, useRef } from "react";

/**
 * Fires best-effort public audit beacons:
 * - link_viewed on mount
 * - submission.started on first meaningful interaction
 */
export function TrackPublicEvents({ slug }: { slug: string }) {
  const startedSent = useRef(false);

  useEffect(() => {
    const key = `paova:link_viewed:${slug}`;
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(key)) {
      return;
    }
    void fetch(`/api/w/${encodeURIComponent(slug)}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "template.link_viewed" }),
      keepalive: true,
    }).then(() => {
      try {
        sessionStorage.setItem(key, "1");
      } catch {
        // ignore quota / private mode
      }
    });
  }, [slug]);

  useEffect(() => {
    function sendStarted() {
      if (startedSent.current) return;
      startedSent.current = true;
      void fetch(`/api/w/${encodeURIComponent(slug)}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "submission.started" }),
        keepalive: true,
      });
    }

    const onPointer = () => sendStarted();
    const onKey = () => sendStarted();

    window.addEventListener("pointerdown", onPointer, { once: true, passive: true });
    window.addEventListener("keydown", onKey, { once: true });

    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [slug]);

  return null;
}
