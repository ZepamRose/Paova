import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { logError, logWarn } from "@/lib/observability/log";

type DbClient = SupabaseClient<Database>;

/** Tuned per endpoint: generous for humans, tight enough to stop scripts. */
export const RATE_LIMITS = {
  /** One signer legitimately submits once; retries after errors stay under this. */
  sign: { windowSeconds: 60 * 10, maxHits: 8 },
  /** Page-view / start beacons fire a couple of times per real visit. */
  publicEvent: { windowSeconds: 60 * 10, maxHits: 30 },
  /**
   * Failed group-token lookups. A legitimate visitor opens ONE valid link, so
   * a run of misses is the signature of token enumeration. Kept tight — this
   * is the bucket that actually protects the roster.
   */
  groupTokenMiss: { windowSeconds: 60 * 10, maxHits: 12 },
  /**
   * Views of a KNOWN group link, keyed per (IP, token). Deliberately generous:
   * a venue kiosk or a school Wi-Fi legitimately loads the same link from one
   * IP dozens of times, and blocking that would break the product.
   */
  groupView: { windowSeconds: 60 * 10, maxHits: 240 },
} as const;

// Single source of truth for the client IP — see lib/client-ip.ts for why the
// leftmost X-Forwarded-For entry must never be trusted.
export { clientIpFrom } from "@/lib/client-ip";

/**
 * Record one hit and report whether the caller may proceed.
 *
 * Production fails closed: a broken counter must not leave the public sign
 * path unlimited. Local/dev still fails open so a missing migration never
 * bricks signing while iterating.
 */
export async function checkRateLimit(
  client: DbClient,
  input: {
    bucket: string;
    identifier: string | null;
    windowSeconds: number;
    maxHits: number;
  },
): Promise<boolean> {
  const failOpen =
    process.env.NODE_ENV !== "production" &&
    process.env.VERCEL_ENV !== "production";

  try {
    const { data, error } = await client.rpc("rate_limit_hit", {
      p_bucket: input.bucket,
      p_identifier: input.identifier ?? "unknown",
      p_window_seconds: input.windowSeconds,
      p_max_hits: input.maxHits,
    });

    if (error) {
      logError("rate_limit.check_failed", error.message, {
        bucket: input.bucket,
      });
      return failOpen;
    }
    if (data === false) {
      logWarn("rate_limit.blocked", { bucket: input.bucket });
      return false;
    }
    return true;
  } catch (err) {
    logError("rate_limit.threw", err, { bucket: input.bucket });
    return failOpen;
  }
}

/**
 * Read a counter WITHOUT recording a hit.
 *
 * Needed when the decision to spend work must come before knowing the outcome:
 * the public group page refuses a caller that is already enumerating tokens
 * before it spends a lookup on the next guess. Returns 0 on failure so a
 * broken counter never blocks a legitimate visitor.
 */
export async function peekRateLimit(
  client: DbClient,
  input: { bucket: string; identifier: string | null; windowSeconds: number },
): Promise<number> {
  try {
    const { data, error } = await client.rpc("rate_limit_peek", {
      p_bucket: input.bucket,
      p_identifier: input.identifier ?? "unknown",
      p_window_seconds: input.windowSeconds,
    });

    if (error) {
      logError("rate_limit.peek_failed", error.message, {
        bucket: input.bucket,
      });
      return 0;
    }
    return typeof data === "number" ? data : 0;
  } catch (err) {
    logError("rate_limit.peek_threw", err, { bucket: input.bucket });
    return 0;
  }
}
