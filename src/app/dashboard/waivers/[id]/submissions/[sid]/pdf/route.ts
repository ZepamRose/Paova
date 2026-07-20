import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createClient } from "@/lib/supabase/server";

type WaiverField = {
  key: string;
  label: string;
  type: string;
  required: boolean;
};

const MARGIN = 50;
const PAGE_WIDTH = 595.28; // A4
const PAGE_HEIGHT = 841.89;

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
    .select("title, legal_text, fields")
    .eq("id", id)
    .maybeSingle();

  if (!template) {
    return new NextResponse("Not found", { status: 404 });
  }

  const fields = (Array.isArray(template.fields)
    ? template.fields
    : []) as unknown as WaiverField[];
  const answers = (submission.answers ?? {}) as Record<string, unknown>;

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  function ensureSpace(needed: number) {
    if (y - needed < MARGIN) {
      page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }
  }

  function wrapText(text: string, size: number, maxWidth: number): string[] {
    const lines: string[] = [];
    for (const paragraph of text.split("\n")) {
      const words = paragraph.split(/\s+/);
      let current = "";
      for (const word of words) {
        const candidate = current ? `${current} ${word}` : word;
        if (font.widthOfTextAtSize(candidate, size) > maxWidth && current) {
          lines.push(current);
          current = word;
        } else {
          current = candidate;
        }
      }
      lines.push(current);
    }
    return lines;
  }

  function drawText(
    text: string,
    size: number,
    options?: { bold?: boolean; gap?: number },
  ) {
    const usedFont = options?.bold ? fontBold : font;
    const maxWidth = PAGE_WIDTH - MARGIN * 2;
    const lines = wrapText(text, size, maxWidth);
    for (const line of lines) {
      ensureSpace(size + 4);
      page.drawText(line, {
        x: MARGIN,
        y,
        size,
        font: usedFont,
        color: rgb(0.1, 0.1, 0.12),
      });
      y -= size + 4;
    }
    y -= options?.gap ?? 0;
  }

  drawText(template.title, 18, { bold: true, gap: 10 });
  drawText(template.legal_text, 10, { gap: 14 });

  drawText("Signataire", 12, { bold: true, gap: 4 });
  drawText(`Nom : ${submission.signer_name}`, 10);
  if (submission.signer_email) {
    drawText(`Email : ${submission.signer_email}`, 10);
  }
  for (const field of fields) {
    const raw = answers[field.key];
    const value =
      typeof raw === "boolean" ? (raw ? "Oui" : "Non") : String(raw ?? "");
    drawText(`${field.label} : ${value}`, 10);
  }
  y -= 6;

  const signedAt = new Date(submission.signed_at).toLocaleString("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
  });
  drawText(`Signé le : ${signedAt}`, 10);
  if (submission.ip_address) {
    drawText(`Adresse IP : ${submission.ip_address}`, 10, { gap: 10 });
  }

  drawText("Signature", 12, { bold: true, gap: 6 });

  if (
    typeof submission.signature_url === "string" &&
    submission.signature_url.startsWith("data:image/png;base64,")
  ) {
    try {
      const base64 = submission.signature_url.split(",")[1];
      const bytes = Uint8Array.from(Buffer.from(base64, "base64"));
      const png = await pdf.embedPng(bytes);
      const maxW = 240;
      const scale = maxW / png.width;
      const w = maxW;
      const h = png.height * scale;
      ensureSpace(h + 10);
      page.drawImage(png, { x: MARGIN, y: y - h, width: w, height: h });
      y -= h + 10;
    } catch {
      drawText("(signature non disponible)", 10);
    }
  }

  const pdfBytes = await pdf.save();

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="decharge-${submission.signer_name.replace(/[^a-z0-9]+/gi, "-")}.pdf"`,
    },
  });
}
