"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const NAV_TIMEOUT_MS = 12_000;

/** Links that fetch a file without changing the page — must not lock the UI. */
function isNonPageNavigation(anchor: HTMLAnchorElement, href: string): boolean {
  if (anchor.hasAttribute("download")) return true;
  if (anchor.target === "_blank") return true;

  try {
    const url = new URL(href, window.location.href);
    const path = url.pathname.toLowerCase();
    if (path.endsWith("/pdf") || path.endsWith(".pdf")) return true;
    if (path.endsWith("/export") || path.endsWith(".csv")) return true;
    if (/\.(png|jpe?g|gif|webp|svg|csv|zip|xlsx?)$/i.test(path)) return true;
  } catch {
    /* ignore */
  }
  return false;
}

function NavigationProgressInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [active, setActive] = useState(false);

  useEffect(() => {
    setActive(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    document.body.dataset.navigating = active ? "true" : "false";
    return () => {
      delete document.body.dataset.navigating;
    };
  }, [active]);

  // Safety net: never leave the UI locked if a "navigation" was actually a
  // download or a stalled soft-nav (pathname never changed).
  useEffect(() => {
    if (!active) return;
    const id = window.setTimeout(() => setActive(false), NAV_TIMEOUT_MS);
    return () => window.clearTimeout(id);
  }, [active]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const anchor = (event.target as HTMLElement | null)?.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;

      // File downloads / attachments — never enter the loading lock.
      if (isNonPageNavigation(anchor, href)) return;

      // Already navigating — ignore extra clicks on page links only.
      if (document.body.dataset.navigating === "true") {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      if (/^(https?:|mailto:|tel:)/i.test(href)) {
        try {
          const url = new URL(href, window.location.origin);
          if (url.origin !== window.location.origin) return;
        } catch {
          return;
        }
      }

      try {
        const next = new URL(href, window.location.href);
        if (
          next.pathname === window.location.pathname &&
          next.search === window.location.search
        ) {
          return;
        }
      } catch {
        return;
      }

      setActive(true);
    }

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  if (!active) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5 overflow-hidden bg-[var(--color-border)]"
      role="progressbar"
      aria-hidden
    >
      <div className="nav-progress-bar h-full w-1/3 bg-[var(--color-brand)]" />
    </div>
  );
}

/** Thin top bar while internal links load (Suspense-safe for useSearchParams). */
export function NavigationProgress() {
  return (
    <Suspense fallback={null}>
      <NavigationProgressInner />
    </Suspense>
  );
}
