/**
 * Public app origin — safe for client and server.
 * Used for absolute links (emails, QR, etc.).
 */
export function getAppUrl(): string {
  let url = (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    (typeof window !== "undefined" ? window.location.origin : "") ||
    "http://localhost:3000"
  ).trim();

  while (url.startsWith("=")) {
    url = url.slice(1).trim();
  }
  url = url.replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  return url;
}

/**
 * Magic-link return URL (PKCE / default Supabase ConfirmationURL).
 * In the browser we always use the current origin (localhost vs production),
 * so a link requested on localhost brings you back to localhost — not prod.
 */
export function getAuthCallbackUrl(): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/auth/callback`;
  }
  return `${getAppUrl()}/auth/callback`;
}

/**
 * Preferred magic-link landing page. Verifies the session automatically and
 * shows a short “secure connection” moment before redirecting to the app.
 * Pair with a Supabase Magic Link template that uses `token_hash` + this URL.
 */
export function getAuthConfirmUrl(): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/auth/confirm`;
  }
  return `${getAppUrl()}/auth/confirm`;
}
