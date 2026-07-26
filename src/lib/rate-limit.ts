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
