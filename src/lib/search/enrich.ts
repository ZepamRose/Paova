import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import {
  extractSubjectsFromAnswers,
  formatSubjectsLabel,
  formatSubjectsSummary,
  type DisplayField,
} from "@/lib/submissions";
import type { SubmissionSearchRow } from "./query";

type DbClient = SupabaseClient<Database>;

export type EnrichedSignatureRow = {
  submissionId: string;
  templateId: string;
  signerName: string;
  signerEmail: string | null;
  phone: string | null;
  signedAt: string;
  templateTitle: string;
  proofReference: string | null;
  templateVersion: number | null;
  subjectsSummary: string | null;
  subjectsLabel: string | null;
  fields: DisplayField[];
  answers: Record<string, unknown>;
};

export async function enrichSearchRows(
  client: DbClient,
  rows: SubmissionSearchRow[],
): Promise<EnrichedSignatureRow[]> {
  if (rows.length === 0) return [];

  const submissionIds = rows.map((row) => row.submission_id);
  const templateIds = [...new Set(rows.map((row) => row.template_id))];

  const [{ data: answerRows }, { data: templateFieldRows }] =
    await Promise.all([
      client
        .from("submission")
        .select("id, answers, template_id")
        .in("id", submissionIds),
      client.from("waiver_template").select("id, fields").in("id", templateIds),
    ]);

  const fieldsByTemplate = new Map<string, DisplayField[]>();
  for (const template of templateFieldRows ?? []) {
    fieldsByTemplate.set(
      template.id,
      (Array.isArray(template.fields)
        ? template.fields
        : []) as DisplayField[],
    );
  }

  const detailBySubmission = new Map<
    string,
    { fields: DisplayField[]; answers: Record<string, unknown> }
  >();
  const subjectsBySubmission = new Map<
    string,
    { summary: string; label: string }
  >();

  for (const row of answerRows ?? []) {
    const fields = fieldsByTemplate.get(row.template_id) ?? [];
    const answers = (row.answers ?? {}) as Record<string, unknown>;
    detailBySubmission.set(row.id, { fields, answers });

    const groups = extractSubjectsFromAnswers(fields, answers);
    const summary = formatSubjectsSummary(groups);
    if (!summary) continue;
    subjectsBySubmission.set(row.id, {
      summary,
      label: formatSubjectsLabel(groups),
    });
  }

  return rows.map((row) => {
    const detail = detailBySubmission.get(row.submission_id);
    const subjects = subjectsBySubmission.get(row.submission_id);
    return {
      submissionId: row.submission_id,
      templateId: row.template_id,
      signerName: row.signer_name,
      signerEmail: row.signer_email,
      phone: row.phone,
      signedAt: row.signed_at,
      templateTitle: row.template_title,
      proofReference: row.proof_reference,
      templateVersion: row.template_version,
      subjectsSummary: subjects?.summary ?? null,
      subjectsLabel: subjects?.label ?? null,
      fields: detail?.fields ?? [],
      answers: detail?.answers ?? {},
    };
  });
}
