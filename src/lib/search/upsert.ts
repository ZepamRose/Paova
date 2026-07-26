import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { logError } from "@/lib/observability/log";
import { extractPhone, flattenAnswersText } from "./extract";

type DbClient = SupabaseClient<Database>;

type FieldLike = { key: string; type?: string };

export type UpsertSubmissionSearchInput = {
  submissionId: string;
  businessId: string;
  templateId: string;
  signerName: string;
  signerEmail: string | null;
  signedAt: string;
  templateTitle: string;
  businessName: string | null;
  fields: FieldLike[];
  answers: Record<string, unknown>;
  proofReference?: string | null;
  contentSha256?: string | null;
  templateVersion?: number | null;
  status?: string;
};

/** Best-effort upsert into the denormalized search index. */
export async function upsertSubmissionSearch(
  client: DbClient,
  input: UpsertSubmissionSearchInput,
): Promise<void> {
  try {
    const phone = extractPhone(input.fields, input.answers);
    const answersText = flattenAnswersText(input.answers);

    const { error } = await client.from("submission_search").upsert(
      {
        submission_id: input.submissionId,
        business_id: input.businessId,
        template_id: input.templateId,
        signer_name: input.signerName,
        signer_email: input.signerEmail,
        phone,
        proof_reference: input.proofReference ?? null,
        content_sha256: input.contentSha256 ?? null,
        template_title: input.templateTitle,
        business_name: input.businessName,
        template_version: input.templateVersion ?? null,
        status: input.status ?? "signed",
        answers_text: answersText,
        signed_at: input.signedAt,
      },
      { onConflict: "submission_id" },
    );

    if (error) {
      // A signature that never reaches the index exists but is unfindable in
      // search — the classic "ma signature a disparu" support ticket. Log it
      // with ids so it can be alerted on and re-indexed, not just swallowed.
      logError("search.index_failed", error.message, {
        submissionId: input.submissionId,
        businessId: input.businessId,
        templateId: input.templateId,
      });
    }
  } catch (err) {
    logError("search.index_failed", err, {
      submissionId: input.submissionId,
      businessId: input.businessId,
      templateId: input.templateId,
    });
  }
}
