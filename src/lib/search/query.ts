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

async function fetchGroupLinkedSubmissionIds(
  client: DbClient,
  groupId: string | null,
): Promise<string[]> {
  let query = client
    .from("signing_group_member")
    .select("signed_submission_id")
    .not("signed_submission_id", "is", null);

  if (groupId) {
    query = query.eq("group_id", groupId);
  }

  const { data, error } = await query;
  if (error) {
    console.error("group submission ids failed:", error.message);
    throw new Error(error.message);
  }

  const ids = new Set<string>();
  for (const row of data ?? []) {
    if (row.signed_submission_id) ids.add(row.signed_submission_id);
  }
  return [...ids];
}

function matchesTextQuery(row: SubmissionSearchRow, q: string): boolean {
  const needle = q.toLowerCase();
  const hay = [
    row.signer_name,
    row.signer_email,
    row.phone,
    row.proof_reference,
    row.content_sha256,
    row.template_title,
    row.business_name,
    row.answers_text,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(needle);
}

const SEARCH_SELECT =
  "submission_id, business_id, template_id, signer_name, signer_email, phone, proof_reference, content_sha256, template_title, business_name, template_version, status, answers_text, signed_at";

/**
 * Direct index query when filtering by group (include or exclude linked submissions).
 * Avoids missing older group signatures behind the RPC’s global top-200 window.
 */
async function searchSubmissionsWithGroupConstraint(
  client: DbClient,
  n: ReturnType<typeof normalizeSearchFilters>,
  mode: "include" | "exclude",
  groupSubmissionIds: string[],
): Promise<SubmissionSearchRow[]> {
  if (mode === "include" && groupSubmissionIds.length === 0) {
    return [];
  }

  // Exclude: keep FTS quality from RPC, then drop group-linked rows.
  if (mode === "exclude") {
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
    if (groupSubmissionIds.length === 0) {
      return (data ?? []) as SubmissionSearchRow[];
    }
    const exclude = new Set(groupSubmissionIds);
    return ((data ?? []) as SubmissionSearchRow[]).filter(
      (row) => !exclude.has(row.submission_id),
    );
  }

  let query = client
    .from("submission_search")
    .select(SEARCH_SELECT)
    .in("submission_id", groupSubmissionIds.slice(0, 200))
    .order("signed_at", { ascending: false })
    .range(n.offset, n.offset + n.limit - 1);

  if (n.templateId) query = query.eq("template_id", n.templateId);
  if (n.from) query = query.gte("signed_at", n.from);
  if (n.to) query = query.lte("signed_at", n.to);
  if (n.status) query = query.eq("status", n.status);

  const { data, error } = await query;
  if (error) {
    console.error("submission_search group filter failed:", error.message);
    throw new Error(error.message);
  }

  let rows = (data ?? []) as SubmissionSearchRow[];
  if (n.q) {
    rows = rows.filter((row) => matchesTextQuery(row, n.q!));
  }
  return rows;
}

export async function searchSubmissions(
  client: DbClient,
  filters: SearchSubmissionsFilters,
): Promise<SubmissionSearchRow[]> {
  const n = normalizeSearchFilters(filters);

  if (n.groupId) {
    if (n.groupId === GROUP_FILTER_ANY) {
      const ids = await fetchGroupLinkedSubmissionIds(client, null);
      return searchSubmissionsWithGroupConstraint(client, n, "include", ids);
    }
    if (n.groupId === GROUP_FILTER_NONE) {
      const ids = await fetchGroupLinkedSubmissionIds(client, null);
      return searchSubmissionsWithGroupConstraint(client, n, "exclude", ids);
    }

    // Specific group — verify it exists under RLS.
    const { data: group } = await client
      .from("signing_group")
      .select("id")
      .eq("id", n.groupId)
      .maybeSingle();
    if (!group) return [];

    const ids = await fetchGroupLinkedSubmissionIds(client, n.groupId);
    return searchSubmissionsWithGroupConstraint(client, n, "include", ids);
  }

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
