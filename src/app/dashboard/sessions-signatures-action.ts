"use server";

import { createClient } from "@/lib/supabase/server";

export type RecentSignature = {
  id: string;
  signer_name: string;
  signed_at: string;
  template_id: string;
  template_title: string;
  signature_type: string;
  group_id: string | null;
  group_name: string | null;
};

/**
 * Fetch the 8 most recent signatures for a business.
 * Called by the sidebar client component for live polling.
 */
export async function getRecentSignatures(businessId: string): Promise<RecentSignature[]> {
  const supabase = await createClient();

  const { data: submissions } = await supabase
    .from("submission")
    .select("id, signer_name, signed_at, template_id, signature_type, represented_group_id")
    .eq("business_id", businessId)
    .order("signed_at", { ascending: false })
    .limit(8);

  if (!submissions || submissions.length === 0) return [];

  // Batch-fetch template titles
  const templateIds = [...new Set(submissions.map((s) => s.template_id))];
  const { data: templates } = await supabase
    .from("waiver_template")
    .select("id, title")
    .in("id", templateIds);
  const titleById = new Map((templates ?? []).map((t) => [t.id, t.title]));

  // Batch-fetch group names for rep-mode signatures
  const groupIds = submissions
    .map((s) => s.represented_group_id)
    .filter((id): id is string => !!id);
  const nameByGroupId = new Map<string, string>();
  if (groupIds.length > 0) {
    const { data: groups } = await supabase
      .from("signing_group")
      .select("id, name")
      .in("id", groupIds);
    for (const g of groups ?? []) nameByGroupId.set(g.id, g.name);
  }

  return submissions.map((s) => ({
    id: s.id,
    signer_name: s.signer_name,
    signed_at: s.signed_at,
    template_id: s.template_id,
    template_title: titleById.get(s.template_id) ?? "Formulaire",
    signature_type: s.signature_type,
    group_id: s.represented_group_id,
    group_name: s.represented_group_id
      ? (nameByGroupId.get(s.represented_group_id) ?? null)
      : null,
  }));
}
