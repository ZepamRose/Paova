import Link from "next/link";
import { requireDashboardCapability } from "@/lib/auth/session";
import { hasCapability } from "@/lib/auth/permissions";
import type { DashboardGroupRow } from "@/lib/dashboard/types";
import { DashboardArchives } from "./dashboard-archives";
import type { DashboardWaiverRow } from "../dashboard-waivers-section";

/**
 * Archives — one destination instead of a filter.
 *
 * The dashboard used to carry an Actives/Archivées switch *and* an Archives
 * tile pointing at `?view=archived`: two controls, one place. The switch is
 * gone; this page is the single entry point, and the dashboard below it now
 * only ever shows live work.
 */
export default async function ArchivesPage() {
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

  const canManageGroups = hasCapability(membership.role, "manage_groups");

  const { data: templates } = await supabase
    .from("waiver_template")
    .select(
      "id, title, public_slug, status, expires_at, deleted_at, created_at, signature_days, signature_start_minutes, signature_end_minutes, signature_hours_enabled, signature_hours_days",
    )
    .eq("business_id", business.id)
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });

  const { data: groups } = await supabase
    .from("signing_group")
    .select(
      "id, name, status, template_id, scheduled_at, start_time, end_time, duration_minutes, created_at, public_token",
    )
    .eq("business_id", business.id)
    .not("archived_at", "is", null)
    .order("archived_at", { ascending: false });

  const groupIds = (groups ?? []).map((g) => g.id);
  const { data: statsRows } =
    groupIds.length > 0
      ? await supabase.rpc("dashboard_group_stats", {
          p_business_id: business.id,
        })
      : { data: [] as { group_id: string; total: number; signed: number }[] };
  const stats = new Map<string, { total: number; signed: number }>();
  for (const row of statsRows ?? []) {
    stats.set(row.group_id, {
      total: Number(row.total),
      signed: Number(row.signed),
    });
  }

  const templateIds = [...new Set((groups ?? []).map((g) => g.template_id))];
  const { data: groupTemplates } =
    templateIds.length > 0
      ? await supabase
          .from("waiver_template")
          .select("id, title")
          .in("id", templateIds)
      : { data: [] as { id: string; title: string }[] };
  const titleById = new Map((groupTemplates ?? []).map((t) => [t.id, t.title]));

  const archivedGroups: DashboardGroupRow[] = (groups ?? []).map((g) => {
    const s = stats.get(g.id) ?? { total: 0, signed: 0 };
    return {
      id: g.id,
      name: g.name,
      template_id: g.template_id,
      template_title: titleById.get(g.template_id) ?? "Formulaire",
      status: g.status,
      scheduled_at: g.scheduled_at,
      start_time: g.start_time,
      end_time: g.end_time,
      duration_minutes: g.duration_minutes,
      total: s.total,
      signed: s.signed,
      created_at: g.created_at,
      public_token: g.public_token,
    };
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const archivedWaivers = (templates ?? []) as unknown as DashboardWaiverRow[];
  const isEmpty = archivedWaivers.length === 0 && archivedGroups.length === 0;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 py-8 sm:px-8 sm:py-10 lg:px-10">
      <header className="flex flex-col gap-3">
        <Link
          href="/dashboard"
          className="w-fit text-[13px] text-[var(--color-muted)] transition-colors hover:text-[var(--color-foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]"
        >
          ← Retour au tableau de bord
        </Link>
        <div className="flex flex-col gap-1">
          <h1 className="text-[1.625rem] font-semibold tracking-tight sm:text-[1.85rem]">
            Archives
          </h1>
          <p className="max-w-2xl text-[14px] leading-snug text-[var(--color-muted)]">
            Formulaires et sessions retirés du tableau de bord. Les signatures
            restent conservées et consultables.
          </p>
        </div>
      </header>

      {isEmpty ? (
        <div className="rounded-[1.2rem] border border-dashed border-[color-mix(in_srgb,var(--color-border)_80%,var(--color-foreground))] bg-[color-mix(in_srgb,var(--color-surface-2)_40%,transparent)] px-6 py-12 text-center">
          <p className="text-[15px] font-semibold tracking-tight">
            Aucune archive
          </p>
          <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-[var(--color-muted)]">
            Les formulaires et sessions que vous archivez apparaîtront ici. Vous
            pourrez les restaurer à tout moment.
          </p>
        </div>
      ) : (
        <DashboardArchives
          archivedWaivers={archivedWaivers}
          archivedGroups={archivedGroups}
          appUrl={appUrl}
          canManageGroups={canManageGroups}
        />
      )}
    </div>
  );
}
