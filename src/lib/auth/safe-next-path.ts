/**
 * Allow only same-origin relative paths for post-auth redirects.
 * Rejects protocol-relative URLs (`//evil`), backslash tricks, and schemes.
 */
export function safeNextPath(
  raw: string | null | undefined,
  fallback = "/dashboard",
): string {
  if (typeof raw !== "string") return fallback;
  const next = raw.trim();
  if (!next.startsWith("/")) return fallback;
  if (next.startsWith("//")) return fallback;
  if (next.includes("\\") || next.includes("\0")) return fallback;
  // "/http://…" or "/https://…" would still start with "/" but leave the app.
  if (/^\/[a-z][a-z0-9+.-]*:/i.test(next)) return fallback;
  return next;
}
