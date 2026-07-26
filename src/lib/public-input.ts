/**
 * Hard bounds for anonymous input on the public signing endpoint.
 *
 * Nothing upstream limits what an unauthenticated POST can contain, and the
 * payload fans out: a submitted value is stored on `submission`, duplicated
 * into `signature_proof.content_snapshot`, re-serialised to compute the
 * SHA-256, rendered into the PDF, and attached to an outbound email. One
 * oversized field therefore costs storage, CPU and email quota several times
 * over.
 *
 * Limits are deliberately generous for real humans and brutal for scripts.
 */

/** A hand-drawn PNG signature is ~10–60 KB; 512 KB of base64 is already huge. */
export const MAX_SIGNATURE_CHARS = 512 * 1024;
export const MAX_NAME_CHARS = 160;
export const MAX_EMAIL_CHARS = 254; // RFC 5321 practical maximum
/** Free-text answers: long enough for a paragraph, not for a novel. */
export const MAX_FIELD_CHARS = 2000;
export const MAX_PARTICIPANTS = 60;
export const MAX_PARTICIPANT_NOTE_CHARS = 200;
export const MAX_DOB_CHARS = 10; // YYYY-MM-DD

export type PublicParticipant = { name: string; dob: string; note: string };

/** Trim and hard-truncate a free-text value. */
export function clampInput(value: unknown, maxChars: number): string {
  return String(value ?? "")
    .trim()
    .slice(0, maxChars);
}

/**
 * Validate a signature data URL. Returns null when it is absent, malformed or
 * oversized — callers decide which error to surface.
 */
export function parseSignatureDataUrl(value: unknown): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  if (raw.length > MAX_SIGNATURE_CHARS) return null;
  // The PDF renderer only ever embeds PNG; reject anything else up front
  // rather than storing bytes we cannot use.
  if (!raw.startsWith("data:image/png;base64,")) return null;
  return raw;
}

/** Loose shape check — real validation is delivery, this only stops junk. */
export function normalizeEmail(value: unknown): string | null {
  const email = clampInput(value, MAX_EMAIL_CHARS).toLowerCase();
  if (!email) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

/**
 * Parse a participants array from untrusted JSON, bounded in both cardinality
 * and per-field length. Silently drops entries past the cap: a real roster
 * never approaches it, and rejecting the whole submission would punish the
 * signer for a bug elsewhere.
 */
export function parseParticipants(raw: unknown): PublicParticipant[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(String(raw ?? "[]"));
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  return parsed
    .slice(0, MAX_PARTICIPANTS)
    .map((entry) => {
      const p = entry as Partial<PublicParticipant> | null;
      return {
        name: clampInput(p?.name, MAX_NAME_CHARS),
        dob: clampInput(p?.dob, MAX_DOB_CHARS),
        note: clampInput(p?.note, MAX_PARTICIPANT_NOTE_CHARS),
      };
    })
    .filter((p) => p.name.length > 0);
}
