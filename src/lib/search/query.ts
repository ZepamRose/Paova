import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

type DbClient = SupabaseClient<Database>;

export type SubmissionSearchRow = {
  submission_id: string;
  business_id: string;
  template_id: string;
  signer_name: string;
  signer_email: string | null;
  phone: string | null;
  proof_reference: string | null;
  content_sha256: string | null;
  template_title: string;
  business_name: string | null;
  template_version: number | null;
  status: string;
  answers_text: string | null;
  signed_at: string;
};

export type SearchSubmissionsFilters = {
  q?: string | null;
  templateId?: string | null;
  from?: string | null;
  to?: string | null;
  status?: string | null;
  limit?: number;
  offset?: number;
};

function endOfDayIso(dateYmd: string): string {
  return `${dateYmd}T23:59:59.999Z`;
}

function startOfDayIso(dateYmd: string): string {
  return `${dateYmd}T00:00:00.000Z`;
}

/** Normalize URL/search-param filters into RPC args. */
export function normalizeSearchFilters(
  input: SearchSubmissionsFilters,
): {
  q: string | null;
  templateId: string | null;
  from: string | null;
  to: string | null;
  status: string | null;
  limit: number;
  offset: number;
} {
  const q = input.q?.trim() || null;
  const templateId = input.templateId?.trim() || null;
  const fromRaw = input.from?.trim() || null;
  const toRaw = input.to?.trim() || null;
  const status = input.status?.trim() || null;

  return {
    q,
    templateId,
    from: fromRaw ? startOfDayIso(fromRaw) : null,
    to: toRaw ? endOfDayIso(toRaw) : null,
    status: status && status !== "all" ? status : null,
    limit: Math.min(Math.max(input.limit ?? 50, 1), 200),
    offset: Math.max(input.offset ?? 0, 0),
  };
}

export async function searchSubmissions(
  client: DbClient,
  filters: SearchSubmissionsFilters,
): Promise<SubmissionSearchRow[]> {
  const n = normalizeSearchFilters(filters);

  const { data, error } = await client.rpc("search_submissions_for_owner", {
    p_query: n.q,
    p_template_id: n.templateId,
    p_from: n.from,
    p_to: n.to,
    p_status: n.status,
    p_limit: n.limit,
    p_offset: n.offset,
  });

  if (error) {
    console.error("search_submissions_for_owner failed:", error.message);
    throw new Error(error.message);
  }

  return (data ?? []) as SubmissionSearchRow[];
}
