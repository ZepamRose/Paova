/**
 * Turn a Supabase Auth failure into something a human can act on.
 *
 * Why this exists: supabase-js wraps ANY 5xx from the Auth API in an
 * `AuthRetryableFetchError` and does not always extract `msg` from the JSON
 * body — `error.message` then arrives as the literal string `"{}"`. The login
 * form used to render that straight into the page, so a failed magic link
 * looked like "nothing happened": an alert element with `{}` inside it.
 *
 * The most common cause of that 5xx is a mail-delivery failure (unverified
 * sender domain, provider quota), which never surfaces as a clean 4xx.
 *
 * Kept as pure functions so the classification is unit-tested rather than
 * re-derived by pattern-matching strings in two different components.
 */

export type AuthErrorKind = "rate_limit" | "delivery" | "generic";

export type AuthErrorDescription = {
  kind: AuthErrorKind;
  message: string;
};

/** Error thrown by the login form, carrying an already-classified kind. */
export class AuthRequestError extends Error {
  readonly kind: AuthErrorKind;

  constructor(description: AuthErrorDescription) {
    super(description.message);
    this.name = "AuthRequestError";
    this.kind = description.kind;
  }
}

export const DELIVERY_MESSAGE =
  "Nous n'arrivons pas à envoyer l'email de connexion à cette adresse pour le moment. Réessayez dans quelques minutes — si cela persiste, prévenez le propriétaire du compte.";

export const GENERIC_MESSAGE = "Une erreur est survenue. Réessayez.";

const RATE_LIMIT_HINTS = [
  "rate limit",
  "rate_limit",
  "over_email_send_rate",
  "too many",
  "trop de",
] as const;

/**
 * True when `message` carries no information for the user — an empty string, or
 * a JSON blob supabase-js failed to unwrap (`"{}"`, `'{"code":500,...}'`).
 */
function isOpaqueMessage(message: string): boolean {
  const trimmed = message.trim();
  if (!trimmed) return true;
  return trimmed.startsWith("{") || trimmed.startsWith("[");
}

function looksRateLimited(message: string): boolean {
  const lower = message.toLowerCase();
  return RATE_LIMIT_HINTS.some((hint) => lower.includes(hint));
}

/**
 * Classify a raw Supabase Auth error.
 *
 * Order matters: rate limiting is checked on the readable message first
 * (Supabase returns it as a clean 429), then transport/5xx failures, and only
 * then do we trust the message enough to show it verbatim.
 */
export function describeAuthError(error: {
  message?: string | null;
  name?: string | null;
  status?: number | null;
}): AuthErrorDescription {
  const message = (error.message ?? "").trim();
  const name = (error.name ?? "").trim();
  const status = error.status ?? null;

  if (status === 429 || (message && looksRateLimited(message))) {
    return { kind: "rate_limit", message: "" };
  }

  // A 5xx (or a retryable transport wrapper) on the magic-link endpoint means
  // Supabase could not hand the email off to its SMTP provider.
  const isServerFailure = status !== null && status >= 500;
  const isRetryableWrapper = name === "AuthRetryableFetchError";
  if (isServerFailure || isRetryableWrapper || isOpaqueMessage(message)) {
    return { kind: "delivery", message: DELIVERY_MESSAGE };
  }

  return { kind: "generic", message: message || GENERIC_MESSAGE };
}
