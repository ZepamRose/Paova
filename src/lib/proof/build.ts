import { createHash } from "crypto";
import type {
  BuildProofInput,
  EvidenceItem,
  EvidencePackV1,
  ProofOfSignature,
  SignedContentSnapshotV1,
} from "./types";

/** Stable JSON stringify with sorted object keys (UTF-8 safe). */
export function stableStringify(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) {
      sorted[key] = sortValue(obj[key]);
    }
    return sorted;
  }
  return value;
}

export function sha256Hex(payload: string): string {
  return createHash("sha256").update(payload, "utf8").digest("hex");
}

/** Human-readable reference derived from submission UUID. */
export function proofReferenceFromSubmissionId(submissionId: string): string {
  return `PV-${submissionId.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

/**
 * Lightweight UA → device hint. Best-effort only; never used as sole evidence.
 */
export function parseDeviceHint(userAgent: string | null): string | null {
  if (!userAgent) return null;
  const ua = userAgent;

  let os = "Système inconnu";
  if (/Windows/i.test(ua)) os = "Windows";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS";
  else if (/Mac OS X|Macintosh/i.test(ua)) os = "macOS";
  else if (/Linux/i.test(ua)) os = "Linux";

  let browser = "Navigateur inconnu";
  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) browser = "Chrome";
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = "Safari";
  else if (/Firefox\//i.test(ua)) browser = "Firefox";

  const device = /Mobile|Android|iPhone|iPod/i.test(ua)
    ? "Mobile"
    : /iPad|Tablet/i.test(ua)
      ? "Tablette"
      : "Ordinateur";

  return `${browser} · ${os} · ${device}`;
}

export function emptyEvidencePack(): EvidencePackV1 {
  return { schema_version: 1, items: [] };
}

/** Normalize legacy `{}` or unknown JSON into EvidencePackV1. */
export function parseEvidencePack(value: unknown): EvidencePackV1 {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    (value as EvidencePackV1).schema_version === 1 &&
    Array.isArray((value as EvidencePackV1).items)
  ) {
    return value as EvidencePackV1;
  }
  return emptyEvidencePack();
}

/** Append a future proof mechanism without changing the table schema. */
export function appendEvidence(
  pack: EvidencePackV1,
  item: EvidenceItem,
): EvidencePackV1 {
  return {
    schema_version: 1,
    items: [...pack.items, item],
  };
}

export function buildContentSnapshot(
  input: BuildProofInput,
): SignedContentSnapshotV1 {
  const consentRaw = input.answers["__rgpd_consent_at"];
  const consent_at = typeof consentRaw === "string" ? consentRaw : null;

  return {
    schema_version: 1,
    template: {
      id: input.template.id,
      version: input.template.version,
      title: input.template.title,
      legal_text: input.template.legal_text,
      fields: input.template.fields,
      signer_name_label: input.template.signer_name_label,
    },
    signer: {
      name: input.signerName,
      email: input.signerEmail,
    },
    answers: input.answers,
    signature_data_url: input.signatureDataUrl,
    consent_at,
    signed_at: input.signedAt,
  };
}

export function hashContentSnapshot(snapshot: SignedContentSnapshotV1): string {
  return sha256Hex(stableStringify(snapshot));
}

/** Recompute SHA-256 and compare to the stored digest (constant-time-ish). */
export function verifySnapshotIntegrity(
  snapshot: SignedContentSnapshotV1,
  expectedSha256: string,
): boolean {
  const actual = hashContentSnapshot(snapshot);
  const a = actual.toLowerCase();
  const b = expectedSha256.toLowerCase();
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export function buildProofOfSignature(
  input: BuildProofInput,
  contentSha256: string,
): ProofOfSignature {
  return {
    reference: proofReferenceFromSubmissionId(input.submissionId),
    signedAt: input.signedAt,
    timezone: input.timezone,
    timezoneOffsetMinutes: input.timezoneOffsetMinutes,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    deviceHint: parseDeviceHint(input.userAgent),
    templateId: input.template.id,
    templateVersion: input.template.version,
    contentSha256,
    hashAlgorithm: "SHA-256",
    evidence: emptyEvidencePack(),
  };
}
