"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireActionCapability } from "@/lib/auth/session";
import { recordAuditEvent } from "@/lib/audit";
import { logError, logInfo } from "@/lib/observability/log";
import { deleteSignatureObject } from "@/lib/signatures/storage";

/**
 * Erase one signature at the signer's request (GDPR art. 17).
 *
 * The row is hard-deleted, not soft-deleted: an erasure request means the
 * personal data must actually be gone. Cascades remove the proof dossier, the
 * search index entry and the group link (see migration 0030). The audit trail
 * survives with a null submission_id, so the business keeps evidence that an
 * erasure happened without keeping the erased data itself.
 */
export async function eraseSubmission(formData: FormData) {
  const submissionId = String(formData.get("submission_id") ?? "").trim();
  const returnTo = String(formData.get("return_to") ?? "").trim();

  if (!submissionId) {
    redirect("/dashboard/signatures?error=invalid");
  }

  // Auth + claim invites; capability is re-checked on the submission tenant below.
  const { supabase, user, membership: sessionMembership } =
    await requireActionCapability("delete_submission");

  const { data: submission } = await supabase
    .from("submission")
    .select("id, business_id, template_id, signer_name, signature_url")
    .eq("id", submissionId)
    .maybeSingle();

  if (!submission) {
    redirect("/dashboard/signatures?error=invalid");
  }

  const { membership } =
    submission.business_id === sessionMembership.businessId
      ? { membership: sessionMembership }
      : await requireActionCapability(
          "delete_submission",
          submission.business_id,
        );

  // Record before deleting: afterwards the signer name is gone for good.
  await recordAuditEvent(supabase, {
    businessId: submission.business_id,
    actorUserId: user.id,
    actorKind: membership.role,
    entityType: "submission",
    entityId: submission.id,
    templateId: submission.template_id,
    submissionId: submission.id,
    eventType: "submission.erased",
    payload: { reason: "gdpr_erasure_request" },
  });

  const { error } = await supabase
    .from("submission")
    .delete()
    .eq("id", submissionId);

  if (error) {
    logError("submission.erase_failed", error.message, {
      submissionId,
      businessId: submission.business_id,
    });
    redirect("/dashboard/signatures?error=erase");
  }

  // Private Storage objects are not cascaded by the DB — remove when present.
  if (
    submission.signature_url &&
    !submission.signature_url.startsWith("data:")
  ) {
    const service = createServiceRoleClient();
    await deleteSignatureObject(service, submission.signature_url);
  }

  logInfo("submission.erased", {
    submissionId,
    businessId: submission.business_id,
    actorRole: membership.role,
  });

  revalidatePath("/dashboard/signatures");
  revalidatePath(`/dashboard/waivers/${submission.template_id}`);

  redirect(
    returnTo === "waiver"
      ? `/dashboard/waivers/${submission.template_id}?success=erased`
      : "/dashboard/signatures?success=erased",
  );
}
