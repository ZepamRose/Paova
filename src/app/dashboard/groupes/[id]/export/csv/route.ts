import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getActiveMembership } from "@/lib/auth/membership";
import { hasCapability } from "@/lib/auth/permissions";
import { recordAuditEvent } from "@/lib/audit";
import { csvCell } from "@/lib/search";

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

  const membership = await getActiveMembership(supabase, user.id);
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
    .select(
      "full_name, dob, parent_email, note, signed_submission_id, signed_at",
    )
    .eq("group_id", group.id)
    .order("full_name", { ascending: true });

  const list = members ?? [];
  const submissionIds = list
    .map((m) => m.signed_submission_id)
    .filter((sid): sid is string => Boolean(sid));

  const proofBySubmission = new Map<string, string>();
  if (submissionIds.length > 0) {
    const { data: proofs } = await supabase
      .from("signature_proof")
      .select("submission_id, reference")
      .in("submission_id", submissionIds);
    for (const p of proofs ?? []) {
      proofBySubmission.set(p.submission_id, p.reference);
    }
  }

  const header = [
    "Participant",
    "Date de naissance",
    "Email",
    "Note",
    "Statut",
    "Signé le",
    "Référence preuve",
  ];

  const rows = list.map((m) => {
    const signed = Boolean(m.signed_submission_id);
    return [
      csvCell(m.full_name),
      csvCell(m.dob),
      csvCell(m.parent_email),
      csvCell(m.note),
      csvCell(signed ? "Signé" : "En attente"),
      csvCell(
        m.signed_at
          ? new Date(m.signed_at).toLocaleString("fr-FR")
          : "",
      ),
      csvCell(
        m.signed_submission_id
          ? (proofBySubmission.get(m.signed_submission_id) ?? "")
          : "",
      ),
    ].join(",");
  });

  const body = `\uFEFF${[header.map(csvCell).join(","), ...rows].join("\r\n")}`;

  await recordAuditEvent(supabase, {
    businessId: business.id,
    actorUserId: user.id,
    actorKind: "owner",
    entityType: "export",
    entityId: group.id,
    templateId: group.template_id,
    eventType: "export.csv_generated",
    payload: {
      scope: "signing_group",
      group_id: group.id,
      group_name: group.name,
      row_count: list.length,
    },
  });

  const safe = group.name
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 40);
  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="groupe-${safe || "export"}-${stamp}.csv"`,
    },
  });
}
