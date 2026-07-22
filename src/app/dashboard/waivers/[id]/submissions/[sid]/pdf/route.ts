import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { recordAuditEvent } from "@/lib/audit";
import { generateWaiverPdf, type WaiverField } from "@/lib/pdf";
import type { SignedContentSnapshotV1 } from "@/lib/proof";

function isSnapshotV1(value: unknown): value is SignedContentSnapshotV1 {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return v.schema_version === 1 && typeof v.template === "object" && v.template != null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; sid: string }> },
) {
  const { id, sid } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { data: submission } = await supabase
    .from("submission")
    .select(
      "id, signer_name, signer_email, answers, signature_url, ip_address, signed_at",
    )
    .eq("id", sid)
    .eq("template_id", id)
    .maybeSingle();

  if (!submission) {
    return new NextResponse("Not found", { status: 404 });
  }

  const { data: template } = await supabase
    .from("waiver_template")
    .select("title, legal_text, fields, signer_name_label, business_id")
    .eq("id", id)
    .maybeSingle();

  if (!template) {
    return new NextResponse("Not found", { status: 404 });
  }

  // Confirm ownership via business (RLS already scopes template select).
  const { data: ownedBusiness } = await supabase
    .from("business")
    .select("id")
    .eq("id", template.business_id)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!ownedBusiness) {
    return new NextResponse("Not found", { status: 404 });
  }

  const { data: business } = await supabase
    .from("business")
    .select("name, brand_color, brand_font, logo_url")
    .eq("id", template.business_id)
    .maybeSingle();

  const { data: proofRow } = await supabase
    .from("signature_proof")
    .select(
      "reference, signed_at, timezone, timezone_offset_minutes, ip_address, user_agent, device_hint, template_version, content_sha256, hash_algorithm, content_snapshot",
    )
    .eq("submission_id", sid)
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

  const pdfBytes = await generateWaiverPdf({
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
    brandFont: business?.brand_font ?? null,
    logoUrl: business?.logo_url ?? null,
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

  await recordAuditEvent(supabase, {
    businessId: template.business_id,
    actorUserId: user.id,
    actorKind: "owner",
    entityType: "submission",
    entityId: sid,
    templateId: id,
    submissionId: sid,
    eventType: "pdf.generated",
    payload: {
      channel: "dashboard_download",
      reference: proofRow?.reference ?? null,
    },
  });
  await recordAuditEvent(supabase, {
    businessId: template.business_id,
    actorUserId: user.id,
    actorKind: "owner",
    entityType: "submission",
    entityId: sid,
    templateId: id,
    submissionId: sid,
    eventType: "pdf.downloaded",
    payload: {
      reference: proofRow?.reference ?? null,
      signer_name: submission.signer_name,
    },
  });

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="decharge-${submission.signer_name.replace(/[^a-z0-9]+/gi, "-")}.pdf"`,
    },
  });
}
