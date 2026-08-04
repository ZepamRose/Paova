import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveBusinessContext } from "@/lib/auth/membership";
import { actorKindFromRole } from "@/lib/auth/actor-kind";
import { getBusinessContext, hasCapability } from "@/lib/auth/permissions";
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

  await resolveBusinessContext(supabase, user.id, user);

  const { data: group } = await supabase
    .from("signing_group")
    .select("id, name, template_id, business_id, requires_signature, signature_mode")
    .eq("id", id)
    .maybeSingle();
  if (!group) {
    return new NextResponse("Not found", { status: 404 });
  }

  const membership = await getBusinessContext(
    supabase,
    group.business_id,
    user.id,
  );
  // Bulk PII extraction — owner/admin only, never employees.
  if (!membership || !hasCapability(membership.role, "export_data")) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  const business = { id: group.business_id };

  // Sessions without signatures cannot export PDFs
  if (!group.requires_signature || !group.template_id) {
    return new NextResponse("Cette session ne nécessite pas de signatures.", { status: 400 });
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

  // Template + business + logo are identical for every member of the group:
  // resolve them once instead of re-querying (and re-fetching the logo) per
  // document.
  const context = await loadSubmissionPdfContext(supabase, group.template_id);
  if (!context) {
    return new NextResponse("Not found", { status: 404 });
  }

  const safe = group.name
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 40);
  const stamp = new Date().toISOString().slice(0, 10);

  // ── Mode représentant : un seul PDF pour tout le groupe ──────────────────
  if (group.signature_mode === "group_representative") {
    const { data: repSubmission } = await supabase
      .from("submission")
      .select("id, signer_name")
      .eq("represented_group_id", group.id)
      .eq("signature_type", "group_representative")
      .maybeSingle();

    if (!repSubmission) {
      return new NextResponse("Aucune signature représentant à exporter.", { status: 404 });
    }

    const { data: repProofRow } = await supabase
      .from("signature_proof")
      .select(
        "submission_id, reference, signed_at, timezone, timezone_offset_minutes, ip_address, user_agent, device_hint, template_version, content_sha256, hash_algorithm",
      )
      .eq("submission_id", repSubmission.id)
      .maybeSingle();

    const pdf = await buildSubmissionPdf(
      supabase,
      { submissionId: repSubmission.id, templateId: group.template_id },
      {
        context,
        proofRow: repProofRow ? { ...repProofRow, content_snapshot: null } : null,
      },
    );

    if (!pdf) {
      return new NextResponse("Impossible de générer le PDF représentant.", { status: 500 });
    }

    await recordAuditEvent(supabase, {
      businessId: business.id,
      actorUserId: user.id,
      actorKind: actorKindFromRole(membership.role),
      entityType: "export",
      entityId: group.id,
      templateId: group.template_id,
      eventType: "export.zip_generated",
      payload: {
        scope: "group_representative_pdf",
        group_id: group.id,
        group_name: group.name,
        submission_id: repSubmission.id,
        format: "pdf",
      },
    });

    const filename = `decharge-representant-${safe || "groupe"}-${stamp}.pdf`;
    return new NextResponse(Buffer.from(pdf.bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  // ── Mode individuel : ZIP avec un PDF par participant ────────────────────
  if (signed.length > MAX_PDFS) {
    return new NextResponse(
      `Trop de PDF (${signed.length}). Maximum ${MAX_PDFS} par export — contactez le support ou exportez par lots.`,
      { status: 413 },
    );
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
    actorKind: actorKindFromRole(membership.role),
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

  return new NextResponse(Buffer.from(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="groupe-${safe || "pdfs"}-${stamp}.zip"`,
    },
  });
}
