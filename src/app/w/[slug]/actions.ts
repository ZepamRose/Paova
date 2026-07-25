"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { FREE_MONTHLY_LIMIT, isPro, currentMonthStartISO } from "@/lib/plan";
import { generateWaiverPdf } from "@/lib/pdf";
import { sendSignerConfirmation } from "@/lib/email";
import {
  buildContentSnapshot,
  buildProofOfSignature,
  hashContentSnapshot,
} from "@/lib/proof";
import { recordAuditEvent } from "@/lib/audit";
import {
  configFromTemplateRow,
  ensureTemplateNotStale,
  isExpirationMode,
  isTemplateStatus,
  isWithinSignatureHours,
  type ExpirationMode,
} from "@/lib/templates";
import { upsertSubmissionSearch } from "@/lib/search";
import { resolveTemplateVersionId } from "@/lib/versions";
import { ensureGroupAccepting } from "@/lib/groups/lifecycle";
import type { Json } from "@/types/database.types";

type WaiverField = {
  key: string;
  label: string;
  type:
    | "text"
    | "textarea"
    | "number"
    | "tel"
    | "date"
    | "checkbox"
    | "select"
    | "participants";
  required: boolean;
  options?: string[];
};

type Participant = { name: string; dob: string; note: string };

export async function submitWaiver(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const signature = String(formData.get("signature") ?? "");
  const signerName = String(formData.get("signer_name") ?? "").trim();
  const signerEmail = String(formData.get("signer_email") ?? "").trim();
  const consent = formData.get("rgpd_consent");
  const consentGiven = consent === "on" || consent === "true";
  const clientTimezone = String(formData.get("client_timezone") ?? "").trim() || null;
  const offsetRaw = String(formData.get("client_timezone_offset") ?? "").trim();
  const timezoneOffsetMinutes =
    offsetRaw !== "" && Number.isFinite(Number(offsetRaw))
      ? Number(offsetRaw)
      : null;

  if (!slug) {
    redirect("/");
  }

  const supabase = createServiceRoleClient();

  const { data: template } = await supabase
    .from("waiver_template")
    .select(
      "id, business_id, title, legal_text, fields, signer_name_label, status, expiration_mode, expiration_days, expires_at, deleted_at, version, signature_hours_enabled, signature_timezone, signature_hours_start, signature_hours_end, signature_hours_days",
    )
    .eq("public_slug", slug)
    .maybeSingle();

  if (
    !template ||
    !isTemplateStatus(template.status) ||
    template.deleted_at
  ) {
    redirect("/");
  }

  const expirationMode: ExpirationMode = isExpirationMode(
    template.expiration_mode,
  )
    ? template.expiration_mode
    : "none";

  const lifecycle = await ensureTemplateNotStale(supabase, {
    id: template.id,
    business_id: template.business_id,
    title: template.title,
    status: template.status,
    expiration_mode: expirationMode,
    expiration_days: template.expiration_days,
    expires_at: template.expires_at,
  });
  if (!lifecycle.acceptsSignatures) {
    redirect(`/w/${slug}?error=closed`);
  }

  const hoursConfig = configFromTemplateRow(template);
  if (!isWithinSignatureHours(hoursConfig)) {
    redirect(`/w/${slug}?error=hours`);
  }

  // Enforce the free-plan monthly limit (based on the business owner's plan).
  const { data: business } = await supabase
    .from("business")
    .select(
      "owner_id, name, brand_color, brand_font, logo_url, brand_accent, tagline, contact_address, contact_phone, contact_email, website_url, pdf_show_logo, pdf_show_name, pdf_show_contact, pdf_show_website, pdf_show_phone, pdf_show_footer, email_from_name, email_subject_template, email_signature, email_footer, email_show_logo",
    )
    .eq("id", template.business_id)
    .maybeSingle();

  if (business) {
    const { data: ownerProfile } = await supabase
      .from("profiles")
      .select("plan, subscription_status")
      .eq("id", business.owner_id)
      .maybeSingle();

    if (!isPro(ownerProfile)) {
      const { count } = await supabase
        .from("submission")
        .select("id", { count: "exact", head: true })
        .eq("business_id", template.business_id)
        .gte("signed_at", currentMonthStartISO());

      if ((count ?? 0) >= FREE_MONTHLY_LIMIT) {
        redirect(`/w/${slug}?error=limit`);
      }
    }
  }

  const fields = (Array.isArray(template.fields)
    ? template.fields
    : []) as unknown as WaiverField[];

  if (!signerName) {
    redirect(`/w/${slug}?error=required`);
  }

  if (!signature) {
    redirect(`/w/${slug}?error=signature`);
  }

  if (!consentGiven) {
    redirect(`/w/${slug}?error=consent`);
  }

  const answers: Record<string, unknown> = {
    __rgpd_consent_at: new Date().toISOString(),
  };

  const groupToken = String(formData.get("group_token") ?? "").trim();
  let groupMemberIds: string[] = [];
  try {
    const parsed = JSON.parse(String(formData.get("group_member_ids") ?? "[]"));
    if (Array.isArray(parsed)) {
      groupMemberIds = [...new Set(parsed.map((id) => String(id)).filter(Boolean))];
    }
  } catch {
    groupMemberIds = [];
  }

  // Group signing: roster members, or express walk-in (create members on the fly).
  let verifiedGroupId: string | null = null;
  let groupParticipants: Participant[] = [];
  const expressWalkIn = String(formData.get("express_walk_in") ?? "") === "1";

  if (groupToken && (groupMemberIds.length > 0 || expressWalkIn)) {
    const { data: group } = await supabase
      .from("signing_group")
      .select("id, business_id, template_id, status, closes_at, kind")
      .eq("public_token", groupToken)
      .maybeSingle();

    const groupOpen =
      group &&
      group.business_id === template.business_id &&
      group.template_id === template.id
        ? await ensureGroupAccepting(supabase, group)
        : false;

    if (!group || !groupOpen) {
      redirect(`/g/${groupToken}?error=closed`);
    }

    if (expressWalkIn) {
      if (group.kind !== "express") {
        redirect(`/g/${groupToken}?error=closed`);
      }

      let walkIn: Participant[] = [];
      try {
        const parsed = JSON.parse(
          String(formData.get("express_participants") ?? "[]"),
        );
        if (Array.isArray(parsed)) {
          walkIn = parsed
            .map((p) => ({
              name: String((p as Participant)?.name ?? "").trim(),
              dob: String((p as Participant)?.dob ?? "").trim(),
              note: String((p as Participant)?.note ?? "").trim(),
            }))
            .filter((p) => p.name.length > 0);
        }
      } catch {
        walkIn = [];
      }

      if (walkIn.length === 0) {
        redirect(`/g/${groupToken}?error=required`);
      }

      const { data: inserted, error: insertErr } = await supabase
        .from("signing_group_member")
        .insert(
          walkIn.map((p) => ({
            group_id: group.id,
            full_name: p.name.slice(0, 160),
            dob: p.dob || null,
            note: p.note || null,
          })),
        )
        .select("id, full_name, dob, note");

      if (insertErr || !inserted?.length) {
        console.error("express walk-in member insert failed:", insertErr);
        redirect(`/g/${groupToken}?error=members`);
      }

      verifiedGroupId = group.id;
      groupMemberIds = inserted.map((m) => m.id);
      groupParticipants = inserted.map((m) => ({
        name: m.full_name,
        dob: m.dob ?? "",
        note: m.note ?? "",
      }));
    } else {
      const { data: roster } = await supabase
        .from("signing_group_member")
        .select("id, full_name, dob, note, signed_submission_id")
        .eq("group_id", group.id)
        .in("id", groupMemberIds);

      const valid = (roster ?? []).filter((m) => !m.signed_submission_id);
      if (valid.length === 0 || valid.length !== groupMemberIds.length) {
        redirect(`/g/${groupToken}?error=members`);
      }

      verifiedGroupId = group.id;
      groupMemberIds = valid.map((m) => m.id);
      groupParticipants = valid.map((m) => ({
        name: m.full_name,
        dob: m.dob ?? "",
        note: m.note ?? "",
      }));
    }

    answers.__group_token = groupToken;
    answers.__group_id = verifiedGroupId;
    answers.__group_member_ids = groupMemberIds;
    if (expressWalkIn) answers.__group_express = true;
  }

  for (const field of fields) {
    const raw = formData.get(`field_${field.key}`);
    if (field.type === "checkbox") {
      const checked = raw === "on" || raw === "true";
      if (field.required && !checked) {
        redirect(`/w/${slug}?error=required`);
      }
      answers[field.key] = checked;
    } else if (field.type === "participants") {
      let list: { name: string; dob: string; note: string }[] = [];
      try {
        const parsed = JSON.parse(String(raw ?? "[]"));
        if (Array.isArray(parsed)) {
          list = parsed
            .map((p) => ({
              name: String((p as Participant)?.name ?? "").trim(),
              dob: String((p as Participant)?.dob ?? "").trim(),
              note: String((p as Participant)?.note ?? "").trim(),
            }))
            .filter((p) => p.name.length > 0);
        }
      } catch {
        list = [];
      }
      // Prefer verified roster when signing via a group link.
      if (groupParticipants.length > 0) {
        list = groupParticipants;
      }
      if (field.required && list.length === 0) {
        redirect(`/w/${slug}?error=required`);
      }
      answers[field.key] = list;
    } else {
      const value = String(raw ?? "").trim();
      if (field.required && !value) {
        redirect(`/w/${slug}?error=required`);
      }
      answers[field.key] = value;
    }
  }

  // Templates without a participants field still keep children on the PDF side-channel.
  if (groupParticipants.length > 0 && !fields.some((f) => f.type === "participants")) {
    answers.__group_participants = groupParticipants;
  }

  const headerList = await headers();
  const ip =
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headerList.get("x-real-ip") ??
    null;
  const userAgent = headerList.get("user-agent");

  const { data: inserted, error } = await supabase
    .from("submission")
    .insert({
      template_id: template.id,
      business_id: template.business_id,
      signer_name: signerName,
      signer_email: signerEmail || null,
      answers: answers as unknown as Json,
      signature_url: signature,
      ip_address: ip,
    })
    .select("id, signed_at")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const signedAt = inserted?.signed_at ?? new Date().toISOString();
  const templateVersion = template.version ?? 1;

  const proofInput = {
    submissionId: inserted.id,
    signedAt,
    timezone: clientTimezone,
    timezoneOffsetMinutes,
    ipAddress: ip,
    userAgent,
    template: {
      id: template.id,
      version: templateVersion,
      title: template.title,
      legal_text: template.legal_text,
      fields: fields as unknown[],
      signer_name_label: template.signer_name_label,
    },
    signerName,
    signerEmail: signerEmail || null,
    answers,
    signatureDataUrl: signature,
  };

  const snapshot = buildContentSnapshot(proofInput);
  const contentSha256 = hashContentSnapshot(snapshot);
  const proof = buildProofOfSignature(proofInput, contentSha256);

  // Best-effort: never block the signer if proof insert fails.
  try {
    const templateVersionId = await resolveTemplateVersionId(
      supabase,
      template.id,
      templateVersion,
    );
    const { error: proofError } = await supabase.from("signature_proof").insert({
      submission_id: inserted.id,
      reference: proof.reference,
      signed_at: proof.signedAt,
      timezone: proof.timezone,
      timezone_offset_minutes: proof.timezoneOffsetMinutes,
      ip_address: proof.ipAddress,
      user_agent: proof.userAgent,
      device_hint: proof.deviceHint,
      template_id: proof.templateId,
      template_version: proof.templateVersion,
      template_version_id: templateVersionId,
      content_snapshot: snapshot as unknown as Json,
      content_sha256: proof.contentSha256,
      hash_algorithm: proof.hashAlgorithm,
      evidence: proof.evidence as unknown as Json,
    });
    if (proofError) {
      console.error("signature_proof insert failed:", proofError);
    }
  } catch (proofErr) {
    console.error("signature_proof insert failed:", proofErr);
  }

  await recordAuditEvent(supabase, {
    businessId: template.business_id,
    actorKind: "signer",
    entityType: "submission",
    entityId: inserted.id,
    templateId: template.id,
    submissionId: inserted.id,
    eventType: "submission.signed",
    payload: {
      signer_name: signerName,
      signer_email: signerEmail || null,
      reference: proof.reference,
      template_version: templateVersion,
    },
  });

  await upsertSubmissionSearch(supabase, {
    submissionId: inserted.id,
    businessId: template.business_id,
    templateId: template.id,
    signerName,
    signerEmail: signerEmail || null,
    signedAt,
    templateTitle: template.title,
    businessName: business?.name ?? null,
    fields,
    answers,
    proofReference: proof.reference,
    contentSha256: proof.contentSha256,
    templateVersion,
    status: "signed",
  });

  // Mark group roster members as signed (service role).
  if (verifiedGroupId && groupMemberIds.length > 0) {
    try {
      await supabase
        .from("signing_group_member")
        .update({
          signed_submission_id: inserted.id,
          signed_at: signedAt,
        })
        .eq("group_id", verifiedGroupId)
        .in("id", groupMemberIds)
        .is("signed_submission_id", null);
    } catch (groupErr) {
      console.error("group member mark signed failed:", groupErr);
    }
  }

  // Best-effort: email the signer their signed PDF. Never block the flow.
  if (signerEmail) {
    try {
      const pdfBytes = await generateWaiverPdf({
        title: template.title,
        legalText: template.legal_text,
        fields,
        signerName,
        signerNameLabel: template.signer_name_label,
        signerEmail,
        answers,
        signatureDataUrl: signature,
        ipAddress: ip,
        signedAt,
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
        proof: {
          reference: proof.reference,
          signedAt: proof.signedAt,
          timezone: proof.timezone,
          timezoneOffsetMinutes: proof.timezoneOffsetMinutes,
          ipAddress: proof.ipAddress,
          userAgent: proof.userAgent,
          deviceHint: proof.deviceHint,
          templateVersion: proof.templateVersion,
          contentSha256: proof.contentSha256,
          hashAlgorithm: proof.hashAlgorithm,
        },
      });

      await sendSignerConfirmation({
        to: signerEmail,
        signerName,
        businessName: business?.name ?? null,
        fromName: business?.email_from_name ?? null,
        subjectTemplate: business?.email_subject_template ?? null,
        signature: business?.email_signature ?? null,
        footer: business?.email_footer ?? null,
        showLogo: business?.email_show_logo !== false,
        logoUrl: business?.logo_url ?? null,
        waiverTitle: template.title,
        brandColor: business?.brand_color ?? "#111827",
        pdfBytes,
      });

      await recordAuditEvent(supabase, {
        businessId: template.business_id,
        actorKind: "system",
        entityType: "submission",
        entityId: inserted.id,
        templateId: template.id,
        submissionId: inserted.id,
        eventType: "pdf.generated",
        payload: { channel: "email_confirmation", reference: proof.reference },
      });
    } catch (emailError) {
      console.error("Signer confirmation email failed:", emailError);
    }
  }

  const { mintPdfDownloadToken } = await import("@/lib/pdf-download-token");
  const pdfToken = mintPdfDownloadToken({
    submissionId: inserted.id,
    slug,
  });
  const merciParams = new URLSearchParams({
    sid: inserted.id,
    t: pdfToken,
  });
  if (String(formData.get("borne") ?? "") === "1") {
    merciParams.set("borne", "1");
  }
  redirect(`/w/${slug}/merci?${merciParams.toString()}`);
}
