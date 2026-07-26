/**
 * Trusted client IP resolution.
 *
 * `X-Forwarded-For` is a list the CLIENT can prepend to:
 *     X-Forwarded-For: <anything the client wants>, <what our proxy observed>
 * Reading the leftmost entry therefore trusts attacker-supplied input. That is
 * wrong twice over here: the IP lands in the legal proof dossier (where it is
 * presented as evidence), and it keys the public rate limiter (which rotating
 * a forged header would defeat).
 *
 * Correct rule: only the entries appended by infrastructure we control are
 * trustworthy, and those are at the RIGHT of the list. With `n` trusted proxies
 * in front of the app, the real client IP is the nth entry counting from the
 * right.
 *
 * Configure `TRUSTED_PROXY_HOPS` to match the deployment:
 *   1 (default) — a single reverse proxy / CDN in front (Vercel, Cloudflare…)
 *   0           — the app is directly exposed (no proxy): XFF is fully
 *                 untrusted and only the socket address should be used
 *   2+          — chained proxies
 */

/** Number of proxies we control in front of the app. */
function trustedHops(): number {
  const raw = process.env.TRUSTED_PROXY_HOPS?.trim();
  if (!raw) return 1;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 ? n : 1;
}

/** Strip an optional :port and IPv6 brackets, and reject obvious junk. */
function normalizeIp(value: string | null | undefined): string | null {
  const raw = (value ?? "").trim();
  if (!raw) return null;
  // Bracketed IPv6 with port: [::1]:443
  const bracketed = /^\[([^\]]+)\](?::\d+)?$/.exec(raw);
  const candidate = bracketed ? bracketed[1]! : raw;
  // Reject anything that cannot plausibly be an address — a forged header can
  // contain arbitrary text, and this value is stored as evidence.
  if (candidate.length > 45 || /[^0-9a-fA-F:.]/.test(candidate)) return null;
  return candidate;
}

/**
 * Resolve the client IP from request headers, trusting only what our own
 * infrastructure appended. Returns null when no trustworthy value exists —
 * callers must treat null as "unknown", never as a shared bucket key that
 * could merge distinct visitors.
 */
export function clientIpFrom(headerList: Headers): string | null {
  // Vercel sets this itself and strips any client-supplied copy, so it is
  // authoritative when present.
  const platform = normalizeIp(headerList.get("x-vercel-forwarded-for"));
  if (platform) return platform;

  const hops = trustedHops();
  if (hops === 0) {
    // No proxy we control: every forwarding header is client-controlled.
    return null;
  }

  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) {
    const entries = forwarded
      .split(",")
      .map((part) => normalizeIp(part))
      .filter((part): part is string => Boolean(part));
    // nth from the right — anything further left is attacker-controlled.
    const index = entries.length - hops;
    if (index >= 0 && index < entries.length) {
      return entries[index]!;
    }
    // Fewer entries than expected hops: the chain is shorter than configured,
    // so the leftmost is the closest to a real value we have.
    return entries[0] ?? null;
  }

  // Overwritten (not appended) by nginx-style proxies.
  return normalizeIp(headerList.get("x-real-ip"));
}
