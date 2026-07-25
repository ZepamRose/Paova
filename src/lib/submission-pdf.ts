import type { SupabaseClient } from "@supabase/supabase-js";
import { generateWaiverPdf, type WaiverField } from "@/lib/pdf";
import type { SignedContentSnapshotV1 } from "@/lib/proof";
import type { Database } from "@/types/database.types";

function isSnapshotV1(value: unknown): value is SignedContentSnapshotV1 {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    v.schema_version === 1 && typeof v.template === "object" && v.template != null
  );
}

export type SubmissionPdfResult = {
  bytes: Uint8Array;
  signerName: string;
  businessId: string;
  templateId: string;
  reference: string | null;
};

/** Build a signed-waiver PDF for a submission that belongs to the given template. */
export async function buildSubmissionPdf(
  supabase: SupabaseClient<Database>,
  input: { submissionId: string; templateId: string },
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

  const { data: template } = await supabase
    .from("waiver_template")
    .select("title, legal_text, fields, signer_name_label, business_id")
    .eq("id", input.templateId)
    .maybeSingle();

  if (!template) return null;

  const { data: business } = await supabase
    .from("business")
    .select(
      "name, brand_color, brand_font, logo_url, brand_accent, tagline, contact_address, contact_phone, contact_email, website_url, pdf_show_logo, pdf_show_name, pdf_show_contact, pdf_show_website, pdf_show_phone, pdf_show_footer",
    )
    .eq("id", template.business_id)
    .maybeSingle();

  const { data: proofRow } = await supabase
    .from("signature_proof")
    .select(
      "reference, signed_at, timezone, timezone_offset_minutes, ip_address, user_agent, device_hint, template_version, content_sha256, hash_algorithm, content_snapshot",
    )
    .eq("submission_id", input.submissionId)
    .maybeSingle();

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
    signatureDataUrl:
      snapshot?.signature_data_url ?? submission.signature_url,
    ipAddress: proofRow?.ip_address ?? submission.ip_address,
    signedAt: snapshot?.signed_at ?? submission.signed_at,
    businessName: business?.name ?? null,
    brandColor: business?.brand_color ?? "#111827",
    brandAccent: business?.brand_accent ?? null,
    brandFont: business?.brand_font ?? null,
    logoUrl: business?.logo_url ?? null,
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
