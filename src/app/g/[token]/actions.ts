"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { checkRateLimit, clientIpFrom, RATE_LIMITS } from "@/lib/rate-limit";
import { parseSignatureDataUrl, clampInput, normalizeEmail } from "@/lib/public-input";
import { pngBytesFromDataUrl, uploadSignaturePng } from "@/lib/signatures/storage";
import { logError, logWarn, logInfo } from "@/lib/observability/log";
import { generateWaiverPdf } from "@/lib/pdf";
import { sendSignerConfirmation } from "@/lib/email";
import { recordAuditEvent } from "@/lib/audit";

const MAX_NAME_CHARS = 120;

/**
 * Soumettre la signature d'un représentant de groupe
 */
export async function submitGroupRepresentativeSignature(formData: FormData) {
  const groupToken = String(formData.get("group_token") ?? "").trim();
  const signatureDataUrl = parseSignatureDataUrl(formData.get("signature"));
  const signerName = clampInput(formData.get("signer_name"), MAX_NAME_CHARS);
  const signerEmail = normalizeEmail(formData.get("signer_email")) ?? "";
  const representativeRole = clampInput(formData.get("representative_role"), 120) || null;

  if (!groupToken) {
    redirect("/");
  }

  const supabase = createServiceRoleClient();

  // Rate limiting
  const requestHeaders = await headers();
  const signerIp = clientIpFrom(requestHeaders);
  const withinLimit = await checkRateLimit(supabase, {
    bucket: `group_rep_sign:${groupToken}`,
    identifier: signerIp,
    windowSeconds: RATE_LIMITS.sign.windowSeconds,
    maxHits: RATE_LIMITS.sign.maxHits,
  });

  if (!withinLimit) {
    logWarn("group_representative.rate_limited", { groupToken });
    redirect(`/g/${groupToken}?error=rate`);
  }

  // Récupérer le groupe
  const { data: group } = await supabase
    .from("signing_group")
    .select("id, business_id, template_id, status, signature_mode, requires_signature")
    .eq("public_token", groupToken)
    .maybeSingle();

  if (!group || group.status !== "open" || group.signature_mode !== "group_representative") {
    redirect(`/g/${groupToken}?error=invalid`);
  }

  if (!group.requires_signature || !group.template_id) {
    redirect(`/g/${groupToken}?error=invalid`);
  }

  // Vérifier si une signature représentant existe déjà
  const { data: existing } = await supabase
    .from("submission")
    .select("id")
    .eq("represented_group_id", group.id)
    .eq("signature_type", "group_representative")
    .maybeSingle();

  if (existing) {
    redirect(`/g/${groupToken}?error=already_signed`);
  }

  // Validation des données
  if (!signerName || signerName.length < 2) {
    redirect(`/g/${groupToken}?error=name_required`);
  }

  if (!signerEmail || !signerEmail.includes("@")) {
    redirect(`/g/${groupToken}?error=email_required`);
  }

  if (!signatureDataUrl) {
    redirect(`/g/${groupToken}?error=signature_required`);
  }

  // Decode signature
  const signatureBytes = pngBytesFromDataUrl(signatureDataUrl);
  if (!signatureBytes) {
    redirect(`/g/${groupToken}?error=signature_invalid`);
  }

  // Créer la submission d'abord pour avoir l'ID
  const { data: submission, error: subError } = await supabase
    .from("submission")
    .insert({
      business_id: group.business_id,
      template_id: group.template_id,
      signer_name: signerName,
      signer_email: signerEmail,
      signature_url: "", // Will be updated after upload
      signature_type: "group_representative",
      representative_role: representativeRole,
      represented_group_id: group.id,
      ip_address: signerIp,
      answers: {},
    })
    .select("id")
    .single();

  if (subError || !submission) {
    logError("group_representative.submission_failed", subError?.message || "unknown", {
      groupId: group.id,
    });
    redirect(`/g/${groupToken}?error=submit`);
  }

  // Upload de la signature
  const uploadResult = await uploadSignaturePng(supabase, {
    businessId: group.business_id,
    submissionId: submission.id,
    bytes: signatureBytes,
  });

  if (!uploadResult) {
    // Rollback: delete the submission
    await supabase.from("submission").delete().eq("id", submission.id);
    logError("group_representative.upload_failed", "Upload failed", {
      groupId: group.id,
    });
    redirect(`/g/${groupToken}?error=upload`);
  }

  // Update submission with signature path
  const { data: updatedSub, error: updateError } = await supabase
    .from("submission")
    .update({ signature_url: uploadResult.path })
    .eq("id", submission.id)
    .select("id, signed_at")
    .single();

  if (updateError) {
    logError("group_representative.update_failed", updateError.message, {
      submissionId: submission.id,
    });
  }

  const signedAt = updatedSub?.signed_at ?? new Date().toISOString();

  // ── Fix 3 : marquer tous les membres du groupe comme signés ──────────────
  const { error: memberUpdateError } = await supabase
    .from("signing_group_member")
    .update({
      signed_submission_id: submission.id,
      signed_at: signedAt,
    })
    .eq("group_id", group.id)
    .is("signed_submission_id", null);

  if (memberUpdateError) {
    // Non-fatal : la submission existe déjà, ne pas bloquer la redirection
    logError("group_representative.member_update_failed", memberUpdateError.message, {
      groupId: group.id,
      submissionId: submission.id,
    });
  }

  // ── Fix 4 : PDF + email de confirmation ─────────────────────────────────
  // Best-effort — ne jamais bloquer la redirection si ça échoue
  try {
    const [{ data: template }, { data: business }] = await Promise.all([
      supabase
        .from("waiver_template")
        .select("id, title, legal_text, fields, signer_name_label, version")
        .eq("id", group.template_id)
        .maybeSingle(),
      supabase
        .from("business")
        .select(
          "id, name, brand_color, brand_accent, brand_font, logo_url, tagline, contact_address, contact_phone, contact_email, website_url, pdf_show_logo, pdf_show_name, pdf_show_contact, pdf_show_website, pdf_show_phone, pdf_show_footer, email_from_name, email_subject_template, email_signature, email_footer, email_show_logo",
        )
        .eq("id", group.business_id)
        .maybeSingle(),
    ]);

    if (template && business && signerEmail) {
      const fields = (Array.isArray(template.fields) ? template.fields : []) as {
        key: string;
        label: string;
        type: string;
        required: boolean;
      }[];

      const pdfBytes = await generateWaiverPdf({
        title: template.title,
        legalText: template.legal_text,
        fields,
        signerName,
        signerNameLabel: template.signer_name_label,
        signerEmail,
        answers: {
          __representative_role: representativeRole ?? null,
          __group_representative: true,
        },
        signatureDataUrl: signatureDataUrl,
        ipAddress: signerIp,
        signedAt,
        businessName: business.name ?? null,
        brandColor: business.brand_color ?? "#111827",
        brandAccent: business.brand_accent ?? null,
        brandFont: business.brand_font ?? null,
        logoUrl: business.logo_url ?? null,
        tagline: business.tagline ?? null,
        contactAddress: business.contact_address ?? null,
        contactPhone: business.contact_phone ?? null,
        contactEmail: business.contact_email ?? null,
        websiteUrl: business.website_url ?? null,
        showLogo: business.pdf_show_logo !== false,
        showName: business.pdf_show_name !== false,
        showContact: business.pdf_show_contact !== false,
        showWebsite: business.pdf_show_website === true,
        showPhone: business.pdf_show_phone !== false,
        showFooter: business.pdf_show_footer !== false,
      });

      const emailSent = await sendSignerConfirmation({
        to: signerEmail,
        signerName,
        businessName: business.name ?? null,
        fromName: business.email_from_name ?? null,
        subjectTemplate: business.email_subject_template ?? null,
        signature: business.email_signature ?? null,
        footer: business.email_footer ?? null,
        showLogo: business.email_show_logo !== false,
        logoUrl: business.logo_url ?? null,
        waiverTitle: template.title,
        brandColor: business.brand_color ?? "#111827",
        pdfBytes,
      });

      if (emailSent) {
        await recordAuditEvent(supabase, {
          businessId: group.business_id,
          actorKind: "signer",
          entityType: "submission",
          entityId: submission.id,
          templateId: group.template_id,
          submissionId: submission.id,
          eventType: "pdf.generated",
          payload: { channel: "email_confirmation", signature_type: "group_representative" },
        });
      } else {
        logWarn("group_representative.email_skipped", {
          submissionId: submission.id,
          groupId: group.id,
        });
      }

      logInfo("group_representative.signed", {
        submissionId: submission.id,
        groupId: group.id,
        businessId: group.business_id,
      });
    }
  } catch (pdfEmailErr) {
    logError("group_representative.pdf_email_failed", pdfEmailErr, {
      submissionId: submission.id,
      groupId: group.id,
    });
  }

  // Rediriger vers la page de confirmation
  redirect(`/g/${groupToken}/merci`);
}
