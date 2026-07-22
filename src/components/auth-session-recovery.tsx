"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Recovers sessions when Supabase redirects to Site URL (`/`) with tokens
 * in the URL hash (or a PKCE `code` on the wrong path). Without this, the
 * first magic-link click looks like a useless trip to the landing page.
 */
export function AuthSessionRecovery() {
  useEffect(() => {
    const url = new URL(window.location.href);
    const path = url.pathname;

    // Dedicated auth routes handle their own exchange.
    if (path.startsWith("/auth/")) return;

    const code = url.searchParams.get("code");
    if (code) {
      const next = url.searchParams.get("next") ?? "/dashboard";
      const params = new URLSearchParams({ code, next });
      window.location.replace(`/auth/callback?${params.toString()}`);
      return;
    }

    const hash = url.hash.startsWith("#") ? url.hash.slice(1) : "";
    if (!hash) return;

    const hashParams = new URLSearchParams(hash);
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");
    const errorDescription =
      hashParams.get("error_description") ?? hashParams.get("error");

    if (errorDescription) {
      window.location.replace(
        `/login?error=auth&message=${encodeURIComponent(errorDescription)}`,
      );
      return;
    }

    if (!accessToken || !refreshToken) return;

    const supabase = createClient();
    void supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => {
        if (error) {
          window.location.replace("/login?error=auth");
          return;
        }
        // Drop the tokens from the URL before entering the app.
        window.history.replaceState(null, "", path || "/");
        window.location.replace("/dashboard");
      });
  }, []);

  return null;
}
