"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { checkRateLimit, clientIpFrom, RATE_LIMITS } from "@/lib/rate-limit";
import {
  clampInput,
  normalizeEmail,
  parseParticipants,
  parseSignatureDataUrl,
  MAX_FIELD_CHARS,
  MAX_NAME_CHARS,
  MAX_PARTICIPANTS,
} from "@/lib/public-input";
import { logError, logInfo, logWarn } from "@/lib/observability/log";
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
import {
  deleteSignatureObject,
  pngBytesFromDataUrl,
  sha256HexBytes,
  uploadSignaturePng,
} from "@/lib/signatures/storage";
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

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function submitWaiver(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  // Every value below comes from an anonymous POST — bound before use.
  const signature = parseSignatureDataUrl(formData.get("signature"));
  const signerName = clampInput(formData.get("signer_name"), MAX_NAME_CHARS);
  const signerEmail = normalizeEmail(formData.get("signer_email")) ?? "";
  const consent = formData.get("rgpd_consent");
  const consentGiven = consent === "on" || consent === "true";
  const clientTimezone = clampInput(formData.get("client_timezone"), 64) || null;
  const offsetRaw = String(formData.get("client_timezone_offset") ?? "").trim();
  const timezoneOffsetMinutes =
    offsetRaw !== "" && Number.isFinite(Number(offsetRaw))
      ? Number(offsetRaw)
      : null;

  if (!slug) {
    redirect("/");
  }

  const supabase = createServiceRoleClient();

  // Anonymous write endpoint: throttle per IP before doing any real work,
  // otherwise anyone holding the QR link can burn the business's quota.
  const requestHeaders = await headers();
  const signerIp = clientIpFrom(requestHeaders);
  const withinLimit = await checkRateLimit(supabase, {
    bucket: `sign:${slug}`,
    identifier: signerIp,
    windowSeconds: RATE_LIMITS.sign.windowSeconds,
    maxHits: RATE_LIMITS.sign.maxHits,
  });
  if (!withinLimit) {
    logWarn("submission.rate_limited", { slug });
    redirect(`/w/${slug}?error=rate`);
  }

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
      "owner_id, name, plan, subscription_status, brand_color, brand_font, logo_url, brand_accent, tagline, contact_address, contact_phone, contact_email, website_url, pdf_show_logo, pdf_show_name, pdf_show_contact, pdf_show_website, pdf_show_phone, pdf_show_footer, email_from_name, email_subject_template, email_signature, email_footer, email_show_logo",
    )
    .eq("id", template.business_id)
    .maybeSingle();

  if (business) {
    if (!isPro(business)) {
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
      // Bounded and shape-checked: these ids go straight into a SQL `IN`.
      groupMemberIds = [
        ...new Set(
          parsed
            .map((id) => String(id))
            .filter((id) => UUID_RE.test(id))
            .slice(0, MAX_PARTICIPANTS),
        ),
      ];
    }
  } catch {
    groupMemberIds = [];
  }

  // Group signing: roster members, or express walk-in (create members on the fly).
  let verifiedGroupId: string | null = null;
  let groupParticipants: Participant[] = [];
  const expressWalkIn = String(formData.get("express_walk_in") ?? "") === "1";
  // Defer express member INSERT until after field validation + right before
  // the submission row — otherwise a failed required field / later error leaves
  // unsigned orphan roster rows.
  let pendingExpressWalkIn: Participant[] | null = null;

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

      // Bounded parse: an anonymous walk-in must not be able to insert an
      // unlimited number of roster rows in a single request.
      const walkIn = parseParticipants(formData.get("express_participants"));

      if (walkIn.length === 0) {
        redirect(`/g/${groupToken}?error=required`);
      }

      verifiedGroupId = group.id;
      groupParticipants = walkIn;
      pendingExpressWalkIn = walkIn;
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
    if (!pendingExpressWalkIn) {
      answers.__group_member_ids = groupMemberIds;
    }
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
      let list = parseParticipants(raw);
      // Prefer verified roster when signing via a group link.
      if (groupParticipants.length > 0) {
        list = groupParticipants;
      }
      if (field.required && list.length === 0) {
        redirect(`/w/${slug}?error=required`);
      }
      answers[field.key] = list;
    } else {
      const value = clampInput(raw, MAX_FIELD_CHARS);
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

  // Persist express walk-in roster rows only once validation succeeded.
  if (pendingExpressWalkIn && verifiedGroupId) {
    const { data: walkInRows, error: insertErr } = await supabase
      .from("signing_group_member")
      .insert(
        pendingExpressWalkIn.map((p) => ({
          group_id: verifiedGroupId,
          full_name: p.name,
          dob: p.dob || null,
          note: p.note || null,
        })),
      )
      .select("id, full_name, dob, note");

    if (insertErr || !walkInRows?.length) {
      logError("express.walk_in_insert_failed", insertErr?.message ?? "empty", {
        groupId: verifiedGroupId,
      });
      redirect(`/g/${groupToken}?error=members`);
    }

    groupMemberIds = walkInRows.map((m) => m.id);
    groupParticipants = walkInRows.map((m) => ({
      name: m.full_name,
      dob: m.dob ?? "",
      note: m.note ?? "",
    }));
    answers.__group_member_ids = groupMemberIds;
    if (answers.__group_participants) {
      answers.__group_participants = groupParticipants;
    }
  }

  // Same resolved IP as the rate limiter above — one value, one trust model.
  // This is the address recorded in the proof dossier, so it must never be a
  // client-supplied header (see lib/client-ip.ts).
  const ip = signerIp;
  const userAgent = requestHeaders.get("user-agent");

  // Pre-generate the submission id so Storage path and the row share one UUID.
  const submissionId = crypto.randomUUID();
  const pngBytes = pngBytesFromDataUrl(signature);
  const signatureSha256 = pngBytes ? sha256HexBytes(pngBytes) : null;

  let signatureUrl: string = signature;
  let storedSignaturePath: string | null = null;

  if (pngBytes) {
    const uploaded = await uploadSignaturePng(supabase, {
      businessId: template.business_id,
      submissionId,
      bytes: pngBytes,
    });
    if (uploaded) {
      signatureUrl = uploaded.path;
      storedSignaturePath = uploaded.path;
    } else {
      // Keep the data URL so signing never breaks when Storage is unavailable.
      logWarn("signature.storage_fallback", {
        businessId: template.business_id,
        submissionId,
      });
    }
  }

  const { data: inserted, error } = await supabase
    .from("submission")
    .insert({
      id: submissionId,
      template_id: template.id,
      business_id: template.business_id,
      signer_name: signerName,
      signer_email: signerEmail || null,
      answers: answers as unknown as Json,
      signature_url: signatureUrl,
      ip_address: ip,
    })
    .select("id, signed_at")
    .single();

  if (error) {
    if (storedSignaturePath) {
      await deleteSignatureObject(supabase, storedSignaturePath);
    }
    // Walk-in rows were created just above — remove them so a failed submit
    // does not litter the express roster with unsigned ghosts.
    if (pendingExpressWalkIn && verifiedGroupId && groupMemberIds.length > 0) {
      await supabase
        .from("signing_group_member")
        .delete()
        .eq("group_id", verifiedGroupId)
        .in("id", groupMemberIds)
        .is("signed_submission_id", null);
    }
    // The DB trigger is the authoritative free-plan guard (see migration 0028).
    // Losing the race is a normal outcome, not a crash — show the same page as
    // the optimistic pre-check above.
    if (error.message.includes("FREE_PLAN_LIMIT_REACHED")) {
      logWarn("submission.blocked_free_limit", {
        businessId: template.business_id,
        templateId: template.id,
      });
      redirect(`/w/${slug}?error=limit`);
    }
    logError("submission.insert_failed", error.message, {
      businessId: template.business_id,
      templateId: template.id,
    });
    throw new Error(error.message);
  }

  const signedAt = inserted?.signed_at ?? new Date().toISOString();
  const templateVersion = template.version ?? 1;

  // Claim the roster members immediately after the insert, before any proof /
  // audit / search rows exist.
  //
  // The `.is(null)` filter makes this UPDATE the point of mutual exclusion:
  // whoever flips the row first owns that participant's signature. Claiming
  // fewer rows than requested means a concurrent signer won the race, so we
  // roll the submission back instead of leaving an orphaned row that counts
  // against the monthly quota and appears nowhere in the group's progress.
  if (verifiedGroupId && groupMemberIds.length > 0) {
    const { data: claimed, error: claimError } = await supabase
      .from("signing_group_member")
      .update({
        signed_submission_id: inserted.id,
        signed_at: signedAt,
      })
      .eq("group_id", verifiedGroupId)
      .in("id", groupMemberIds)
      .is("signed_submission_id", null)
      .select("id");

    if (claimError || (claimed?.length ?? 0) !== groupMemberIds.length) {
      await supabase.from("submission").delete().eq("id", inserted.id);
      if (storedSignaturePath) {
        await deleteSignatureObject(supabase, storedSignaturePath);
      }
      // Express walk-ins only exist for this attempt — drop unsigned leftovers.
      if (pendingExpressWalkIn) {
        await supabase
          .from("signing_group_member")
          .delete()
          .eq("group_id", verifiedGroupId)
          .in("id", groupMemberIds)
          .is("signed_submission_id", null);
      }
      logWarn("group.claim_conflict", {
        groupId: verifiedGroupId,
        requested: groupMemberIds.length,
        claimed: claimed?.length ?? 0,
        error: claimError?.message,
      });
      redirect(`/g/${groupToken}?error=members`);
    }
  }

  const useStorageProof = Boolean(storedSignaturePath && signatureSha256);

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
    signatureDataUrl: useStorageProof ? "" : signature,
    ...(useStorageProof && signatureSha256
      ? { signatureSha256 }
      : {}),
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
      // A submission without its proof dossier is a legal gap, not a detail:
      // surface it loudly enough to be alertable.
      logError("proof.insert_failed", proofError.message, {
        submissionId: inserted.id,
        businessId: template.business_id,
      });
    }
  } catch (proofErr) {
    logError("proof.insert_failed", proofErr, {
      submissionId: inserted.id,
      businessId: template.business_id,
    });
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
  let emailSent: boolean | null = null;
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

      emailSent = await sendSignerConfirmation({
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

      if (emailSent) {
        await recordAuditEvent(supabase, {
          businessId: template.business_id,
          actorKind: "system",
          entityType: "submission",
          entityId: inserted.id,
          templateId: template.id,
          submissionId: inserted.id,
          eventType: "pdf.generated",
          payload: {
            channel: "email_confirmation",
            reference: proof.reference,
          },
        });
      } else {
        logWarn("email.signer_confirmation_skipped", {
          submissionId: inserted.id,
          businessId: template.business_id,
        });
      }
    } catch (emailError) {
      emailSent = false;
      logError("email.signer_confirmation_failed", emailError, {
        submissionId: inserted.id,
        businessId: template.business_id,
      });
    }
  }

  logInfo("submission.signed", {
    submissionId: inserted.id,
    businessId: template.business_id,
    templateId: template.id,
    templateVersion,
  });

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
  if (signerEmail && emailSent === false) {
    merciParams.set("email", "0");
  }
  redirect(`/w/${slug}/merci?${merciParams.toString()}`);
}
