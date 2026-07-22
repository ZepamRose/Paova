import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database.types";
import type { TemplateVersionContent } from "./types";

type DbClient = SupabaseClient<Database>;

export type PublishedVersion = {
  id: string;
  version: number;
};

/**
 * Insert an immutable version row for a template.
 * Caller is responsible for bumping waiver_template.version in the same flow.
 */
export async function insertTemplateVersion(
  client: DbClient,
  input: {
    templateId: string;
    version: number;
    content: TemplateVersionContent;
    createdBy?: string | null;
  },
): Promise<PublishedVersion | null> {
  const { data, error } = await client
    .from("waiver_template_version")
    .insert({
      template_id: input.templateId,
      version: input.version,
      title: input.content.title,
      legal_text: input.content.legal_text,
      fields: input.content.fields as Json,
      signer_name_label: input.content.signer_name_label,
      created_by: input.createdBy ?? null,
    })
    .select("id, version")
    .single();

  if (error || !data) {
    console.error("waiver_template_version insert failed:", error?.message);
    return null;
  }

  return { id: data.id, version: data.version };
}

/** Resolve the version row id for a template + version number. */
export async function resolveTemplateVersionId(
  client: DbClient,
  templateId: string,
  version: number,
): Promise<string | null> {
  const { data } = await client
    .from("waiver_template_version")
    .select("id")
    .eq("template_id", templateId)
    .eq("version", version)
    .maybeSingle();
  return data?.id ?? null;
}
