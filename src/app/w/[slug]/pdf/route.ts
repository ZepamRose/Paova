import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { recordAuditEvent } from "@/lib/audit";
import { verifyPdfDownloadToken } from "@/lib/pdf-download-token";
import {
  buildSubmissionPdf,
  pdfFilenameForSigner,
} from "@/lib/submission-pdf";

/** Allow enough time for PDF + logo fetch on serverless. */
export const maxDuration = 30;

/**
 * Public thank-you PDF download.
 * Requires a signed token bound to this submission + slug (not guessable by
 * swapping the sid query param alone).
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const url = new URL(request.url);
  const sid = url.searchParams.get("sid")?.trim();
  const token = url.searchParams.get("t")?.trim();

  if (!sid || !token) {
    return new NextResponse("Not found", { status: 404 });
  }

  if (!verifyPdfDownloadToken(token, { submissionId: sid, slug })) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const supabase = createServiceRoleClient();

    const { data: template } = await supabase
      .from("waiver_template")
      .select("id")
      .eq("public_slug", slug)
      .maybeSingle();

    if (!template) {
      return new NextResponse("Not found", { status: 404 });
    }

    const pdf = await buildSubmissionPdf(supabase, {
      submissionId: sid,
      templateId: template.id,
    });

    if (!pdf) {
      return new NextResponse("Not found", { status: 404 });
    }

    await recordAuditEvent(supabase, {
      businessId: pdf.businessId,
      actorKind: "signer",
      entityType: "submission",
      entityId: sid,
      templateId: pdf.templateId,
      submissionId: sid,
      eventType: "pdf.downloaded",
      payload: {
        channel: "thank_you_download",
        reference: pdf.reference,
        signer_name: pdf.signerName,
      },
    });

    return new NextResponse(Buffer.from(pdf.bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${pdfFilenameForSigner(pdf.signerName)}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Public thank-you PDF failed:", err);
    return new NextResponse("PDF generation failed", { status: 500 });
  }
}
