import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { recordAuditEvent } from "@/lib/audit";
import {
  buildSubmissionPdf,
  pdfFilenameForSigner,
} from "@/lib/submission-pdf";
import { buildZipStore } from "@/lib/zip-store";

/** Keep serverless responses under control — regenerate PDFs on the fly. */
const MAX_PDFS = 40;

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

  const { data: business } = await supabase
    .from("business")
    .select("id")
    .eq("owner_id", user.id)
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

  const usedNames = new Map<string, number>();
  const entries: { name: string; data: Uint8Array }[] = [];

  for (const member of signed) {
    if (!member.signed_submission_id) continue;
    const pdf = await buildSubmissionPdf(supabase, {
      submissionId: member.signed_submission_id,
      templateId: group.template_id,
    });
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
