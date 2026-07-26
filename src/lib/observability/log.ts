/**
 * Structured logging for the paths where a silent failure costs money or
 * trust: signing, billing, erasure, invitations.
 *
 * Emits one JSON object per line. Vercel (and most log drains) parse that into
 * queryable fields, so "how many signatures failed yesterday, and why" becomes
 * a filter instead of a grep through prose.
 *
 * No dependency on purpose: wiring Sentry later means calling its capture from
 * `logError` only — call sites never change.
 *
 * NEVER pass signer names, emails, answers or signature images in `context`.
 * Log identifiers (submission id, business id, slug) and let the database hold
 * the personal data.
 */

export type LogLevel = "info" | "warn" | "error";

export type LogContext = Record<
  string,
  string | number | boolean | null | undefined
>;

function emit(level: LogLevel, event: string, context: LogContext = {}) {
  try {
    const line = JSON.stringify({
      level,
      event,
      ts: new Date().toISOString(),
      ...context,
    });
    if (level === "error") {
      console.error(line);
    } else if (level === "warn") {
      console.warn(line);
    } else {
      console.log(line);
    }
  } catch {
    // Logging must never break the request it is describing.
    console.error(`[log-failed] ${event}`);
  }
}

export function logInfo(event: string, context?: LogContext) {
  emit("info", event, context);
}

export function logWarn(event: string, context?: LogContext) {
  emit("warn", event, context);
}

/** Log a failure with a normalized message. Attach ids, never personal data. */
export function logError(
  event: string,
  error: unknown,
  context?: LogContext,
) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "unknown_error";
  emit("error", event, { ...context, error: message });
  // Drop-in point for Sentry.captureException(error, { tags: context }).
}
