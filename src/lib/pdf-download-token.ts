import { createHmac, timingSafeEqual } from "crypto";

/** Thank-you page PDF links remain valid long enough to reopen a closed tab. */
const TTL_SECONDS = 60 * 60 * 24 * 7;

type TokenPayload = {
  sid: string;
  slug: string;
  exp: number;
};

function signingSecret(): string {
  const dedicated = process.env.PDF_DOWNLOAD_SECRET?.trim();
  if (dedicated) return dedicated;
  const fallback = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!fallback) {
    throw new Error("Missing PDF download signing secret");
  }
  return fallback;
}

function sign(payloadB64: string): string {
  return createHmac("sha256", signingSecret())
    .update(payloadB64)
    .digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/** Mint a signed, time-limited token bound to one submission + public slug. */
export function mintPdfDownloadToken(input: {
  submissionId: string;
  slug: string;
}): string {
  const payload: TokenPayload = {
    sid: input.submissionId,
    slug: input.slug,
    exp: Math.floor(Date.now() / 1000) + TTL_SECONDS,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url",
  );
  return `${payloadB64}.${sign(payloadB64)}`;
}

/**
 * Verify a thank-you PDF token.
 * Returns the bound ids when valid; otherwise null.
 */
export function verifyPdfDownloadToken(
  token: string | null | undefined,
  expected: { submissionId: string; slug: string },
): boolean {
  const raw = (token ?? "").trim();
  if (!raw) return false;

  const dot = raw.lastIndexOf(".");
  if (dot <= 0 || dot === raw.length - 1) return false;

  const payloadB64 = raw.slice(0, dot);
  const signature = raw.slice(dot + 1);
  if (!safeEqual(sign(payloadB64), signature)) return false;

  try {
    const json = Buffer.from(payloadB64, "base64url").toString("utf8");
    const payload = JSON.parse(json) as TokenPayload;
    if (
      typeof payload.sid !== "string" ||
      typeof payload.slug !== "string" ||
      typeof payload.exp !== "number"
    ) {
      return false;
    }
    if (payload.exp < Math.floor(Date.now() / 1000)) return false;
    if (payload.sid !== expected.submissionId) return false;
    if (payload.slug !== expected.slug) return false;
    return true;
  } catch {
    return false;
  }
}

export function buildThankYouPdfHref(input: {
  slug: string;
  submissionId: string;
  token: string;
}): string {
  const params = new URLSearchParams({
    sid: input.submissionId,
    t: input.token,
  });
  return `/w/${input.slug}/pdf?${params.toString()}`;
}
