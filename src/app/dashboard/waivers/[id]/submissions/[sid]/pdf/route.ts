import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { recordAuditEvent } from "@/lib/audit";
import {
  buildSubmissionPdf,
  pdfFilenameForSigner,
} from "@/lib/submission-pdf";

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

  const { data: template } = await supabase
    .from("waiver_template")
    .select("id, business_id")
    .eq("id", id)
    .maybeSingle();

  if (!template) {
    return new NextResponse("Not found", { status: 404 });
  }

  const { data: ownedBusiness } = await supabase
    .from("business")
    .select("id")
    .eq("id", template.business_id)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!ownedBusiness) {
    return new NextResponse("Not found", { status: 404 });
  }

  const pdf = await buildSubmissionPdf(supabase, {
    submissionId: sid,
    templateId: id,
  });

  if (!pdf) {
    return new NextResponse("Not found", { status: 404 });
  }

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
      channel: "dashboard_download",
      reference: pdf.reference,
      signer_name: pdf.signerName,
    },
  });

  return new NextResponse(Buffer.from(pdf.bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${pdfFilenameForSigner(pdf.signerName)}"`,
    },
  });
}
