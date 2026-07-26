import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveBusinessContext } from "@/lib/auth/membership";
import { hasCapability } from "@/lib/auth/permissions";
import { recordAuditEvent } from "@/lib/audit";
import {
  buildSubmissionPdf,
  loadSubmissionPdfContext,
  pdfFilenameForSigner,
} from "@/lib/submission-pdf";
import { buildZipStore } from "@/lib/zip-store";

/** Keep serverless responses under control — regenerate PDFs on the fly. */
const MAX_PDFS = 40;

export const maxDuration = 60;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const membership = await resolveBusinessContext(supabase, user.id, user);
  if (!membership) {
    return new NextResponse("Not found", { status: 404 });
  }
  // Bulk PII extraction — owner/admin only, never employees.
  if (!hasCapability(membership.role, "export_data")) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  const { data: business } = await supabase
    .from("business")
    .select("id")
    .eq("id", membership.businessId)
    .maybeSingle();
  if (!business) {
    return new NextResponse("Not found", { status: 404 });
  }

  const { data: group } = await supabase
    .from("signing_group")
    .select("id, name, template_id")
    .eq("id", id)
    .eq("business_id", business.id)
    .maybeSingle();
  if (!group) {
    return new NextResponse("Not found", { status: 404 });
  }

  const { data: members } = await supabase
    .from("signing_group_member")
    .select("id, full_name, signed_submission_id")
    .eq("group_id", group.id)
    .not("signed_submission_id", "is", null)
    .order("full_name", { ascending: true });

  const signed = members ?? [];
  if (signed.length === 0) {
    return new NextResponse("Aucune signature à exporter.", { status: 404 });
  }
  if (signed.length > MAX_PDFS) {
    return new NextResponse(
      `Trop de PDF (${signed.length}). Maximum ${MAX_PDFS} par export — contactez le support ou exportez par lots.`,
      { status: 413 },
    );
  }

  // Template + business + logo are identical for every member of the group:
  // resolve them once instead of re-querying (and re-fetching the logo) per
  // document. Proof metadata is batched WITHOUT content_snapshot so we do not
  // pull embedded PNGs into memory — buildSubmissionPdf resolves signatures
  // from Storage via submission.signature_url.
  const context = await loadSubmissionPdfContext(supabase, group.template_id);
  if (!context) {
    return new NextResponse("Not found", { status: 404 });
  }

  const submissionIds = signed
    .map((m) => m.signed_submission_id)
    .filter((v): v is string => Boolean(v));

  const { data: proofRows } = await supabase
    .from("signature_proof")
    .select(
      "submission_id, reference, signed_at, timezone, timezone_offset_minutes, ip_address, user_agent, device_hint, template_version, content_sha256, hash_algorithm",
    )
    .in("submission_id", submissionIds);

  const proofBySubmission = new Map(
    (proofRows ?? []).map((row) => [
      row.submission_id,
      { ...row, content_snapshot: null },
    ]),
  );

  const usedNames = new Map<string, number>();
  const entries: { name: string; data: Uint8Array }[] = [];

  for (const member of signed) {
    if (!member.signed_submission_id) continue;
    const pdf = await buildSubmissionPdf(
      supabase,
      {
        submissionId: member.signed_submission_id,
        templateId: group.template_id,
      },
      {
        context,
        proofRow: proofBySubmission.get(member.signed_submission_id) ?? null,
      },
    );
    if (!pdf) continue;

    const base = pdfFilenameForSigner(member.full_name || pdf.signerName);
    const count = usedNames.get(base) ?? 0;
    usedNames.set(base, count + 1);
    const name = count === 0 ? base : base.replace(/\.pdf$/i, `-${count + 1}.pdf`);
    entries.push({ name, data: pdf.bytes });
  }

  if (entries.length === 0) {
    return new NextResponse("Impossible de générer les PDF.", { status: 500 });
  }

  const zip = buildZipStore(entries);

  await recordAuditEvent(supabase, {
    businessId: business.id,
    actorUserId: user.id,
    actorKind: "owner",
    entityType: "export",
    entityId: group.id,
    templateId: group.template_id,
    eventType: "export.zip_generated",
    payload: {
      scope: "signing_group_pdfs",
      group_id: group.id,
      group_name: group.name,
      pdf_count: entries.length,
      format: "zip",
    },
  });

  const safe = group.name
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 40);
  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(Buffer.from(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="groupe-${safe || "pdfs"}-${stamp}.zip"`,
    },
  });
}
