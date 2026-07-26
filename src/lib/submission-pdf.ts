import type { SupabaseClient } from "@supabase/supabase-js";
import {
  fetchLogoBytes,
  generateWaiverPdf,
  type WaiverField,
} from "@/lib/pdf";
import type { SignedContentSnapshotV1 } from "@/lib/proof";
import { resolveSignatureDataUrl } from "@/lib/signatures/storage";
import type { Database } from "@/types/database.types";

function isSnapshotV1(value: unknown): value is SignedContentSnapshotV1 {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    v.schema_version === 1 && typeof v.template === "object" && v.template != null
  );
}

// Mirrors signature_proof: reference / content_sha256 / hash_algorithm /
// template_version are NOT NULL in the schema (migration 0005).
type ProofRow = {
  submission_id?: string;
  reference: string;
  signed_at: string;
  timezone: string | null;
  timezone_offset_minutes: number | null;
  ip_address: string | null;
  user_agent: string | null;
  device_hint: string | null;
  template_version: number;
  content_sha256: string;
  hash_algorithm: string;
  content_snapshot: unknown;
} | null;

export type SubmissionPdfResult = {
  bytes: Uint8Array;
  signerName: string;
  businessId: string;
  templateId: string;
  reference: string | null;
};

const TEMPLATE_COLUMNS =
  "title, legal_text, fields, signer_name_label, business_id";
const BUSINESS_COLUMNS =
  "name, brand_color, brand_font, logo_url, brand_accent, tagline, contact_address, contact_phone, contact_email, website_url, pdf_show_logo, pdf_show_name, pdf_show_contact, pdf_show_website, pdf_show_phone, pdf_show_footer";
const PROOF_COLUMNS =
  "submission_id, reference, signed_at, timezone, timezone_offset_minutes, ip_address, user_agent, device_hint, template_version, content_sha256, hash_algorithm, content_snapshot";

type TemplateRow = {
  title: string;
  legal_text: string;
  fields: unknown;
  signer_name_label: string | null;
  business_id: string;
};
type BusinessRow = {
  name: string;
  brand_color: string;
  brand_font: string | null;
  logo_url: string | null;
  brand_accent: string | null;
  tagline: string | null;
  contact_address: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  website_url: string | null;
  pdf_show_logo: boolean;
  pdf_show_name: boolean;
  pdf_show_contact: boolean;
  pdf_show_website: boolean;
  pdf_show_phone: boolean;
  pdf_show_footer: boolean;
} | null;

/**
 * Template + business + logo shared by every PDF of the same waiver.
 * Loading this once turns an N×4-query export into a handful of round-trips
 * and a single logo fetch.
 */
export type SubmissionPdfContext = {
  template: TemplateRow;
  business: BusinessRow;
  logoBytes: Uint8Array | null;
};

export async function loadSubmissionPdfContext(
  supabase: SupabaseClient<Database>,
  templateId: string,
): Promise<SubmissionPdfContext | null> {
  const { data: template } = await supabase
    .from("waiver_template")
    .select(TEMPLATE_COLUMNS)
    .eq("id", templateId)
    .maybeSingle();

  if (!template) return null;

  const { data: business } = await supabase
    .from("business")
    .select(BUSINESS_COLUMNS)
    .eq("id", template.business_id)
    .maybeSingle();

  const businessRow = business as BusinessRow;
  const showLogo = businessRow?.pdf_show_logo !== false;

  return {
    template: template as TemplateRow,
    business: businessRow,
    // Fetched once here rather than per generated document.
    logoBytes: showLogo ? await fetchLogoBytes(businessRow?.logo_url) : null,
  };
}

/**
 * Build a signed-waiver PDF for a submission that belongs to the given
 * template. Pass `context` (and optionally `proofRow`) when generating many
 * PDFs for the same waiver to avoid re-querying shared data per document.
 */
export async function buildSubmissionPdf(
  supabase: SupabaseClient<Database>,
  input: { submissionId: string; templateId: string },
  preloaded?: {
    context: SubmissionPdfContext;
    proofRow?: Record<string, unknown> | null;
  },
): Promise<SubmissionPdfResult | null> {
  const { data: submission } = await supabase
    .from("submission")
    .select(
      "id, signer_name, signer_email, answers, signature_url, ip_address, signed_at, business_id, template_id",
    )
    .eq("id", input.submissionId)
    .eq("template_id", input.templateId)
    .maybeSingle();

  if (!submission) return null;

  const context =
    preloaded?.context ??
    (await loadSubmissionPdfContext(supabase, input.templateId));
  if (!context) return null;

  const { template, business } = context;

  const proofRow =
    preloaded && "proofRow" in preloaded
      ? (preloaded.proofRow as ProofRow | null)
      : ((
          await supabase
            .from("signature_proof")
            .select(PROOF_COLUMNS)
            .eq("submission_id", input.submissionId)
            .maybeSingle()
        ).data as ProofRow | null);

  const snapshot = isSnapshotV1(proofRow?.content_snapshot)
    ? proofRow.content_snapshot
    : null;

  const fields = (
    Array.isArray(snapshot?.template.fields)
      ? snapshot.template.fields
      : Array.isArray(template.fields)
        ? template.fields
        : []
  ) as unknown as WaiverField[];

  // Prefer snapshot embedding when present; empty string means new Storage
  // format — fall back to submission.signature_url (path or legacy data URL).
  const rawSignature =
    snapshot?.signature_data_url && snapshot.signature_data_url.length > 0
      ? snapshot.signature_data_url
      : submission.signature_url;
  const signatureDataUrl =
    (await resolveSignatureDataUrl(supabase, rawSignature)) ?? rawSignature;

  const bytes = await generateWaiverPdf({
    title: snapshot?.template.title ?? template.title,
    legalText: snapshot?.template.legal_text ?? template.legal_text,
    fields,
    signerName: snapshot?.signer.name ?? submission.signer_name,
    signerNameLabel:
      snapshot?.template.signer_name_label ?? template.signer_name_label,
    signerEmail: snapshot?.signer.email ?? submission.signer_email,
    answers: (snapshot?.answers ??
      submission.answers ??
      {}) as Record<string, unknown>,
    signatureDataUrl,
    ipAddress: proofRow?.ip_address ?? submission.ip_address,
    signedAt: snapshot?.signed_at ?? submission.signed_at,
    businessName: business?.name ?? null,
    brandColor: business?.brand_color ?? "#111827",
    brandAccent: business?.brand_accent ?? null,
    brandFont: business?.brand_font ?? null,
    logoUrl: business?.logo_url ?? null,
    logoBytes: context.logoBytes,
    tagline: business?.tagline ?? null,
    contactAddress: business?.contact_address ?? null,
    contactPhone: business?.contact_phone ?? null,
    contactEmail: business?.contact_email ?? null,
    websiteUrl: business?.website_url ?? null,
    showLogo: business?.pdf_show_logo !== false,
    showName: business?.pdf_show_name !== false,
    showContact: business?.pdf_show_contact !== false,
    showWebsite: business?.pdf_show_website === true,
    showPhone: business?.pdf_show_phone !== false,
    showFooter: business?.pdf_show_footer !== false,
    proof: proofRow
      ? {
          reference: proofRow.reference,
          signedAt: proofRow.signed_at,
          timezone: proofRow.timezone,
          timezoneOffsetMinutes: proofRow.timezone_offset_minutes,
          ipAddress: proofRow.ip_address,
          userAgent: proofRow.user_agent,
          deviceHint: proofRow.device_hint,
          templateVersion: proofRow.template_version,
          contentSha256: proofRow.content_sha256,
          hashAlgorithm: proofRow.hash_algorithm,
        }
      : null,
  });

  return {
    bytes,
    signerName: submission.signer_name,
    businessId: template.business_id,
    templateId: input.templateId,
    reference: proofRow?.reference ?? null,
  };
}

export function pdfFilenameForSigner(signerName: string): string {
  const safe = signerName.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
  return `decharge-${safe || "signature"}.pdf`;
}
