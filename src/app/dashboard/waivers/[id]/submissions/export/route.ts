import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { recordAuditEvent } from "@/lib/audit";
import { csvCell } from "@/lib/search";

type WaiverField = {
  key: string;
  label: string;
  type: string;
  required: boolean;
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { data: template } = await supabase
    .from("waiver_template")
    .select("title, fields, business_id")
    .eq("id", id)
    .maybeSingle();
  if (!template) {
    return new NextResponse("Not found", { status: 404 });
  }

  const fields = (Array.isArray(template.fields)
    ? template.fields
    : []) as unknown as WaiverField[];

  let submissionsQuery = supabase
    .from("submission")
    .select("id, signer_name, signer_email, answers, ip_address, signed_at")
    .eq("template_id", id)
    .order("signed_at", { ascending: false });

  if (from) {
    submissionsQuery = submissionsQuery.gte(
      "signed_at",
      `${from}T00:00:00.000Z`,
    );
  }
  if (to) {
    submissionsQuery = submissionsQuery.lte("signed_at", `${to}T23:59:59.999Z`);
  }

  const { data: submissions } = await submissionsQuery;
  const ids = (submissions ?? []).map((s) => s.id);

  const proofBySubmission = new Map<
    string,
    {
      reference: string;
      content_sha256: string;
      template_version: number;
    }
  >();

  if (ids.length > 0) {
    const { data: proofs } = await supabase
      .from("signature_proof")
      .select("submission_id, reference, content_sha256, template_version")
      .in("submission_id", ids);
    for (const p of proofs ?? []) {
      proofBySubmission.set(p.submission_id, {
        reference: p.reference,
        content_sha256: p.content_sha256,
        template_version: p.template_version,
      });
    }
  }

  const header = [
    "Nom",
    "Email",
    "Date de signature",
    ...fields.map((f) => f.label),
    "Consentement RGPD",
    "Adresse IP",
    "Référence preuve",
    "Version décharge",
    "Empreinte SHA-256",
  ];

  const rows = (submissions ?? []).map((s) => {
    const answers = (s.answers ?? {}) as Record<string, unknown>;
    const consentAt = answers["__rgpd_consent_at"];
    const consentCell =
      typeof consentAt === "string"
        ? new Date(consentAt).toLocaleString("fr-FR")
        : "";
    const proof = proofBySubmission.get(s.id);

    return [
      csvCell(s.signer_name),
      csvCell(s.signer_email),
      csvCell(new Date(s.signed_at).toLocaleString("fr-FR")),
      ...fields.map((f) => csvCell(answers[f.key])),
      csvCell(consentCell),
      csvCell(s.ip_address),
      csvCell(proof?.reference ?? ""),
      csvCell(proof?.template_version ?? ""),
      csvCell(proof?.content_sha256 ?? ""),
    ].join(",");
  });

  const csv = [header.map(csvCell).join(","), ...rows].join("\r\n");
  const body = "\uFEFF" + csv;

  const safeTitle = template.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase();

  await recordAuditEvent(supabase, {
    businessId: template.business_id,
    actorUserId: user.id,
    actorKind: "owner",
    entityType: "export",
    entityId: id,
    templateId: id,
    eventType: "export.csv_generated",
    payload: {
      row_count: (submissions ?? []).length,
      title: template.title,
      from: from || null,
      to: to || null,
    },
  });

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="signatures-${safeTitle}.csv"`,
    },
  });
}
