import { redirect } from "next/navigation";
import { env } from "@/lib/env";
import { isPro, currentMonthStartISO } from "@/lib/plan";
import { getDashboardSession } from "@/lib/auth/session";
import { listActiveMemberships } from "@/lib/auth/membership";
import { hasCapability } from "@/lib/auth/permissions";
import { formatRelativeFr } from "@/lib/dates";
import {
  effectiveTemplateStatus,
  isTemplateStatus,
} from "@/lib/templates";
import type { DashboardAttentionItem } from "@/lib/dashboard/types";
import { DashboardHome } from "./dashboard-home";
import { DashboardBusinessHero } from "./dashboard-business-hero";
import { DashboardHeader } from "./dashboard-header";


export default async function DashboardPage() {
  const { supabase, user, membership } = await getDashboardSession();
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const viewerName =
    [meta.full_name, meta.name, meta.first_name]
      .map((v) => (typeof v === "string" ? v.trim() : ""))
      .find((v) => v.length > 0) ?? null;
  const canManageWaivers = hasCapability(membership.role, "manage_waivers");
  // Créer et animer une session : ouvert aux collaborateurs.
  const canCreateGroups = hasCapability(membership.role, "create_groups");
  // Archiver / restaurer : propriétaires et administrateurs seulement.
  const canManageGroups = hasCapability(membership.role, "manage_groups");
  const canEditBusiness = hasCapability(membership.role, "edit_business_info");

  const seats = await listActiveMemberships(supabase, user.id);
  const seatBusinessIds = seats.map((s) => s.businessId);
  const { data: seatBusinesses } =
    seatBusinessIds.length > 0
      ? await supabase
          .from("business")
          .select("id, name")
          .in("id", seatBusinessIds)
      : { data: [] as { id: string; name: string }[] };
  const nameById = new Map((seatBusinesses ?? []).map((b) => [b.id, b.name]));
  const switcherOptions = seats.map((s) => ({
    businessId: s.businessId,
    name: nameById.get(s.businessId) ?? "Établissement",
    role: s.role,
  }));

  const { data: business } = await supabase
    .from("business")
    .select("id, name, brand_color, plan, subscription_status")
    .eq("id", membership.businessId)
    .maybeSingle();

  if (!business) {
    redirect("/onboarding");
  }

  const { data: allTemplates } = await supabase
    .from("waiver_template")
    .select(
      "id, title, public_slug, status, expires_at, deleted_at, created_at, version, signature_hours_enabled, signature_timezone, signature_hours_start, signature_hours_end, signature_hours_days",
    )
    .eq("business_id", business.id)
    .order("created_at", { ascending: false });

  const { data: signingGroups } = await supabase
    .from("signing_group")
    .select("id, name, status, template_id, scheduled_at, created_at, public_token")
    .eq("business_id", business.id)
    .order("scheduled_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  const groupIds = (signingGroups ?? []).map((g) => g.id);
  const { data: groupStatsRows } =
    groupIds.length > 0
      ? await supabase.rpc("dashboard_group_stats", {
          p_business_id: business.id,
        })
      : { data: [] as { group_id: string; total: number; signed: number }[] };

  const groupStats = new Map<string, { total: number; signed: number }>();
  for (const row of groupStatsRows ?? []) {
    groupStats.set(row.group_id, {
      total: Number(row.total),
      signed: Number(row.signed),
    });
  }

  const groupTemplateIds = [
    ...new Set((signingGroups ?? []).map((g) => g.template_id)),
  ];
  const { data: groupTemplates } =
    groupTemplateIds.length > 0
      ? await supabase
          .from("waiver_template")
          .select("id, title")
          .in("id", groupTemplateIds)
      : { data: [] as { id: string; title: string }[] };
  const groupTemplateTitle = new Map(
    (groupTemplates ?? []).map((t) => [t.id, t.title]),
  );

  const allDashboardGroups = (signingGroups ?? []).map((g) => {
    const s = groupStats.get(g.id) ?? { total: 0, signed: 0 };
    return {
      id: g.id,
      name: g.name,
      template_id: g.template_id,
      template_title: groupTemplateTitle.get(g.template_id) ?? "Formulaire",
      status: g.status,
      scheduled_at: g.scheduled_at,
      total: s.total,
      signed: s.signed,
      created_at: g.created_at,
      public_token: g.public_token,
    };
  });
  const dashboardGroups = allDashboardGroups.filter(
    (g) => g.status !== "archived",
  );
  const activeTemplatesList =
    allTemplates?.filter((t) => !t.deleted_at) ?? [];
  const activeForStats = activeTemplatesList;

  // Plan is per tenant (migration 0031), so every member sees the real tier.
  const pro = isPro(business);
  const monthStart = currentMonthStartISO();

  const [
    { count: usedThisMonth },
    { data: templateStats },
  ] = await Promise.all([
    supabase
      .from("submission")
      .select("id", { count: "exact", head: true })
      .eq("business_id", business.id)
      .gte("signed_at", monthStart),
    // Per-template totals aggregated in SQL (migration 0032): constant payload
    // regardless of how many signatures the business has accumulated.
    supabase.rpc("dashboard_template_stats", { p_business_id: business.id }),
  ]);

  const signatureCountByTemplate = new Map<string, number>();
  const lastSignedByTemplate = new Map<string, string>();
  for (const row of templateStats ?? []) {
    signatureCountByTemplate.set(row.template_id, Number(row.signature_count));
    if (row.last_signed_at) {
      lastSignedByTemplate.set(row.template_id, row.last_signed_at);
    }
  }

  const activeWaivers = activeForStats.filter((t) => {
    if (!isTemplateStatus(t.status)) return false;
    return (
      effectiveTemplateStatus({
        status: t.status,
        expires_at: t.expires_at,
      }) === "open"
    );
  }).length;
  const activeGroups = dashboardGroups.filter((g) => g.status === "open").length;
  const attentionItems: DashboardAttentionItem[] = [];

  for (const t of activeTemplatesList) {
    if (!t.expires_at || !isTemplateStatus(t.status)) continue;
    if (
      effectiveTemplateStatus({ status: t.status, expires_at: t.expires_at }) !==
      "open"
    ) {
      continue;
    }
    const msLeft = new Date(t.expires_at).getTime() - Date.now();
    if (msLeft <= 0 || msLeft > 3 * 24 * 60 * 60 * 1000) continue;
    const days = Math.max(1, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));
    attentionItems.push({
      id: `expiring-${t.id}`,
      kind: "waiver_expiring",
      title: t.title,
      meta: days === 1 ? "Expire demain" : `Expire dans ${days} j`,
      href: `/dashboard/waivers/${t.id}`,
    });
  }

  const nearCompleteGroups: DashboardAttentionItem[] = [];
  const completeGroups: DashboardAttentionItem[] = [];
  for (const g of dashboardGroups) {
    if (g.status !== "open" || g.total === 0) continue;
    const pending = g.total - g.signed;
    if (pending === 0) {
      completeGroups.push({
        id: `complete-${g.id}`,
        kind: "group_complete",
        title: g.name,
        meta: "Toutes les signatures sont réunies — pensez à fermer la session.",
        href: `/dashboard/groupes/${g.id}`,
      });
    } else if (g.signed / g.total >= 0.8) {
      nearCompleteGroups.push({
        id: `near-${g.id}`,
        kind: "group_near_complete",
        title: g.name,
        meta: `${g.signed}/${g.total} signés · ${pending} en attente`,
        href: `/dashboard/groupes/${g.id}`,
      });
    }
  }
  attentionItems.push(...completeGroups, ...nearCompleteGroups);
  const visibleAttentionItems = attentionItems.slice(0, 6);

  // Most recent signature across all templates, from the SQL aggregate.
  const latestSignedAt =
    (templateStats ?? [])
      .map((row) => row.last_signed_at)
      .filter((v): v is string => Boolean(v))
      .sort()
      .at(-1) ?? null;
  const latestTemplate = allTemplates?.[0] ?? null;

  const planLabel = pro ? "Plan Pro" : "Plan Gratuit";
  const lastActivityIso = (() => {
    const times = [latestSignedAt, latestTemplate?.created_at]
      .filter((v): v is string => Boolean(v))
      .map((v) => new Date(v).getTime())
      .filter((n) => !Number.isNaN(n));
    if (times.length === 0) return null;
    return new Date(Math.max(...times)).toISOString();
  })();
  const lastActivityRelative = formatRelativeFr(lastActivityIso);

  const appUrl = env.appUrl;

  const signatureCountRecord = Object.fromEntries(signatureCountByTemplate);
  const lastSignedRecord = Object.fromEntries(lastSignedByTemplate);

  return (
    <main className="relative mx-auto flex min-h-screen max-w-dashboard flex-col gap-5 px-5 py-5 sm:gap-6 sm:px-8 sm:py-9 lg:px-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-96 bg-[radial-gradient(75%_55%_at_50%_-8%,color-mix(in_srgb,var(--color-brand)_9%,transparent),transparent)]"
      />

      <DashboardHeader
        currentBusinessId={membership.businessId}
        businessName={business.name}
        businesses={switcherOptions}
        role={membership.role}
        viewerName={viewerName}
        canEditBusiness={canEditBusiness}
        canManageWaivers={canManageWaivers}
        canCreateGroups={canCreateGroups}
        canCreateGroup={canCreateGroups && activeTemplatesList.length > 0}
      />

      <DashboardBusinessHero
        name={business.name}
        brandColor={business.brand_color}
        planLabel={planLabel}
        isPro={pro}
        lastActivityRelative={lastActivityRelative}
        lastActivityIso={lastActivityIso}
        activeWaivers={activeWaivers}
        activeGroups={activeGroups}
        usedThisMonth={usedThisMonth ?? 0}
        role={membership.role}
        viewerName={viewerName}
      />

      <DashboardHome
        attentionItems={visibleAttentionItems}
        active={activeTemplatesList}
        groups={dashboardGroups}
        appUrl={appUrl}
        signatureCountByTemplate={signatureCountRecord}
        lastSignedByTemplate={lastSignedRecord}
        canCreateGroups={canCreateGroups}
        canManageGroups={canManageGroups}
      />
    </main>
  );
}
