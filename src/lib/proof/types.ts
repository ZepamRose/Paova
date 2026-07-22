/**
 * Proof of Signature — types for Paova's digital evidence dossier.
 * Not an eIDAS-qualified signature; a verifiable, extensible evidence pack.
 */

export type SignedContentSnapshotV1 = {
  schema_version: 1;
  template: {
    id: string;
    version: number;
    title: string;
    legal_text: string;
    fields: unknown[];
    signer_name_label: string | null;
  };
  signer: {
    name: string;
    email: string | null;
  };
  answers: Record<string, unknown>;
  signature_data_url: string;
  consent_at: string | null;
  signed_at: string;
};

/** Extensible proof mechanisms stored in signature_proof.evidence */
export type EvidenceKind =
  | "email_otp"
  | "sms_otp"
  | "external_timestamp"
  | "identity_check"
  | "advanced_signature"
  | (string & {});

export type EvidenceItem = {
  kind: EvidenceKind;
  recorded_at: string;
  status: "recorded" | "verified" | "failed";
  details?: Record<string, unknown>;
};

export type EvidencePackV1 = {
  schema_version: 1;
  items: EvidenceItem[];
};

export type ProofOfSignature = {
  reference: string;
  signedAt: string;
  timezone: string | null;
  timezoneOffsetMinutes: number | null;
  ipAddress: string | null;
  userAgent: string | null;
  deviceHint: string | null;
  templateId: string;
  templateVersion: number;
  contentSha256: string;
  hashAlgorithm: "SHA-256";
  evidence: EvidencePackV1;
};

export type BuildProofInput = {
  submissionId: string;
  signedAt: string;
  timezone: string | null;
  timezoneOffsetMinutes: number | null;
  ipAddress: string | null;
  userAgent: string | null;
  template: {
    id: string;
    version: number;
    title: string;
    legal_text: string;
    fields: unknown[];
    signer_name_label: string | null;
  };
  signerName: string;
  signerEmail: string | null;
  answers: Record<string, unknown>;
  signatureDataUrl: string;
};
