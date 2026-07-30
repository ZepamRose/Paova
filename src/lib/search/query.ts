import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { logError } from "@/lib/observability/log";

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

/** Special group filter values (URL `group=` param). */
export const GROUP_FILTER_ANY = "__any__";
export const GROUP_FILTER_NONE = "__none__";

export type SearchSubmissionsFilters = {
  q?: string | null;
  templateId?: string | null;
  /** Group UUID, `__any__` (via groupe), or `__none__` (hors groupe). */
  groupId?: string | null;
  from?: string | null;
  to?: string | null;
  status?: string | null;
  limit?: number;
  offset?: number;
  /** Required: pin results to one of the caller's active businesses. */
  businessId: string;
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
  groupId: string | null;
  from: string | null;
  to: string | null;
  status: string | null;
  limit: number;
  offset: number;
} {
  const q = input.q?.trim() || null;
  const templateId = input.templateId?.trim() || null;
  const groupId = input.groupId?.trim() || null;
  const fromRaw = input.from?.trim() || null;
  const toRaw = input.to?.trim() || null;
  const status = input.status?.trim() || null;

  return {
    q,
    templateId,
    groupId,
    from: fromRaw ? startOfDayIso(fromRaw) : null,
    to: toRaw ? endOfDayIso(toRaw) : null,
    status: status && status !== "all" ? status : null,
    limit: Math.min(Math.max(input.limit ?? 50, 1), 200),
    offset: Math.max(input.offset ?? 0, 0),
  };
}

function groupRpcArgs(groupId: string | null): {
  p_group_id: string | null;
  p_group_mode: string | null;
} {
  if (!groupId) {
    return { p_group_id: null, p_group_mode: null };
  }
  if (groupId === GROUP_FILTER_ANY) {
    return { p_group_id: null, p_group_mode: "any" };
  }
  if (groupId === GROUP_FILTER_NONE) {
    return { p_group_id: null, p_group_mode: "none" };
  }
  return { p_group_id: groupId, p_group_mode: "one" };
}

export async function searchSubmissions(
  client: DbClient,
  filters: SearchSubmissionsFilters,
): Promise<SubmissionSearchRow[]> {
  const n = normalizeSearchFilters(filters);
  const businessId = filters.businessId?.trim();
  if (!businessId) {
    throw new Error("businessId is required for submission search");
  }

  if (
    n.groupId &&
    n.groupId !== GROUP_FILTER_ANY &&
    n.groupId !== GROUP_FILTER_NONE
  ) {
    // Specific group — verify it exists under RLS before filtering.
    const { data: group } = await client
      .from("signing_group")
      .select("id")
      .eq("id", n.groupId)
      .eq("business_id", businessId)
      .maybeSingle();
    if (!group) return [];
  }

  const groupArgs = groupRpcArgs(n.groupId);

  const { data, error } = await client.rpc("search_submissions_for_owner", {
    p_query: n.q ?? undefined,
    p_template_id: n.templateId ?? undefined,
    p_from: n.from ?? undefined,
    p_to: n.to ?? undefined,
    p_status: n.status ?? undefined,
    p_limit: n.limit,
    p_offset: n.offset,
    p_group_id: groupArgs.p_group_id ?? undefined,
    p_group_mode: groupArgs.p_group_mode ?? undefined,
    p_business_id: businessId,
  });

  if (error) {
    logError("search.query_failed", error.message);
    throw new Error(error.message);
  }

  return (data ?? []) as SubmissionSearchRow[];
}
