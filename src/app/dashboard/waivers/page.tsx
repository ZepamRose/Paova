import { requireDashboardCapability } from "@/lib/auth/session";
import { DashboardTemplatesView } from "../dashboard-templates-view";
import type { DashboardWaiverRow } from "../dashboard-waivers-section";

/**
 * PAOVA V2 - Templates Page
 *
 * Page dédiée aux modèles (anciennement formulaires).
 * Accessible via la navigation principale.
 */
export default async function TemplatesPage() {
  const { supabase, membership } = await requireDashboardCapability(
    "view_submissions",
  );

  const { data: business } = await supabase
    .from("business")
    .select("id")
    .eq("id", membership.businessId)
    .maybeSingle();

  if (!business) {
    return null;
  }

  const { data: allTemplates } = await supabase
    .from("waiver_template")
    .select(
      "id, title, public_slug, status, expires_at, deleted_at, created_at, version, signature_hours_enabled, signature_timezone, signature_hours_start, signature_hours_end, signature_hours_days",
    )
    .eq("business_id", business.id)
    .order("created_at", { ascending: false });

  const activeTemplates = (allTemplates ?? []).filter((t) => !t.deleted_at);

  // Get template stats
  const { data: templateStats } = await supabase.rpc(
    "dashboard_template_stats",
    { p_business_id: business.id },
  );

  const signatureCountByTemplate: Record<string, number> = {};
  const lastSignedByTemplate: Record<string, string> = {};
  for (const row of templateStats ?? []) {
    signatureCountByTemplate[row.template_id] = Number(row.signature_count);
    if (row.last_signed_at) {
      lastSignedByTemplate[row.template_id] = row.last_signed_at;
    }
  }

  // Get groups to calculate usage
  const { data: signingGroups } = await supabase
    .from("signing_group")
    .select("id, template_id, status, requires_signature")
    .eq("business_id", business.id);

  const groupsByTemplate: Record<string, number> = {};
  (signingGroups ?? []).forEach((g) => {
    if (g.status !== "archived" && g.template_id) {
      groupsByTemplate[g.template_id] = (groupsByTemplate[g.template_id] || 0) + 1;
    }
  });

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 py-8 sm:px-8 sm:py-10 lg:px-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-[28px] font-bold tracking-tight text-[var(--color-foreground)] sm:text-[32px]">
          Modèles
        </h1>
        <p className="text-[14px] text-[var(--color-muted)] leading-relaxed">
          Créez et gérez vos modèles de décharge. Chaque modèle peut être utilisé dans plusieurs sessions.
        </p>
      </header>

      <DashboardTemplatesView
        templates={activeTemplates as unknown as DashboardWaiverRow[]}
        signatureCountByTemplate={signatureCountByTemplate}
        lastSignedByTemplate={lastSignedByTemplate}
        groupsByTemplate={groupsByTemplate}
      />
    </div>
  );
}
