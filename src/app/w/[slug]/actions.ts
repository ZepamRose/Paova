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
  ensureTemplateNotStale,
  isExpirationMode,
  isTemplateStatus,
  type ExpirationMode,
} from "@/lib/templates";
import { upsertSubmissionSearch } from "@/lib/search";
import { resolveTemplateVersionId } from "@/lib/versions";
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
      "id, business_id, title, legal_text, fields, signer_name_label, status, expiration_mode, expiration_days, expires_at, version",
    )
    .eq("public_slug", slug)
    .maybeSingle();

  if (!template || !isTemplateStatus(template.status)) {
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

  // Enforce the free-plan monthly limit (based on the business owner's plan).
  const { data: business } = await supabase
    .from("business")
    .select("owner_id, name, brand_color, brand_font, logo_url")
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
        brandFont: business?.brand_font ?? null,
        logoUrl: business?.logo_url ?? null,
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

  redirect(
    `/w/${slug}/merci?sid=${encodeURIComponent(inserted.id)}${
      String(formData.get("borne") ?? "") === "1" ? "&borne=1" : ""
    }`,
  );
}
