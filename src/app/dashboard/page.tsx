import { redirect } from "next/navigation";
import Link from "next/link";
import { CreditCard, Settings, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { isPro, currentMonthStartISO } from "@/lib/plan";
import { resolveBusinessContext } from "@/lib/auth/membership";
import { hasCapability } from "@/lib/auth/permissions";
import { formatRelativeFr } from "@/lib/dates";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  effectiveTemplateStatus,
  isTemplateStatus,
} from "@/lib/templates";
import type {
  DashboardAttentionItem,
  DashboardHeroPulse,
} from "@/lib/dashboard/types";
import { DashboardHome } from "./dashboard-home";
import { DashboardBusinessHero } from "./dashboard-business-hero";
import { DashboardCreateControl } from "./dashboard-create-control";


export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  const initialView = view === "archived" ? "archived" : "active";

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const membership = await resolveBusinessContext(supabase, user.id, user);
  if (!membership) {
    redirect("/onboarding");
  }

  const { data: business } = await supabase
    .from("business")
    .select("id, name, brand_color, plan, subscription_status")
    .eq("id", membership.businessId)
    .maybeSingle();

  if (!business) {
    redirect("/onboarding");
  }

  const sevenDaysAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const fourteenDaysAgo = new Date(
    Date.now() - 14 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const { data: allTemplates } = await supabase
    .from("waiver_template")
    .select(
      "id, title, public_slug, status, expires_at, deleted_at, created_at, version, signature_hours_enabled, signature_timezone, signature_hours_start, signature_hours_end, signature_hours_days",
    )
    .eq("business_id", business.id)
    .order("created_at", { ascending: false });

  const { data: signingGroups } = await supabase
    .from("signing_group")
    .select("id, name, status, template_id, created_at, public_token")
    .eq("business_id", business.id)
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
      template_title: groupTemplateTitle.get(g.template_id) ?? "Décharge",
      status: g.status,
      total: s.total,
      signed: s.signed,
      created_at: g.created_at,
      public_token: g.public_token,
    };
  });
  const dashboardGroups = allDashboardGroups.filter(
    (g) => g.status !== "archived",
  );
  const archivedDashboardGroups = allDashboardGroups.filter(
    (g) => g.status === "archived",
  );

  const activeTemplatesList =
    allTemplates?.filter((t) => !t.deleted_at) ?? [];
  const archivedTemplatesList =
    allTemplates?.filter((t) => Boolean(t.deleted_at)) ?? [];
  const activeForStats = activeTemplatesList;

  // Plan is per tenant (migration 0031), so every member sees the real tier.
  const pro = isPro(business);
  const monthStart = currentMonthStartISO();

  const [
    { count: usedThisMonth },
    { count: last7Days },
    { count: prev7Days },
    { data: templateStats },
    { data: signatureDays },
  ] = await Promise.all([
    supabase
      .from("submission")
      .select("id", { count: "exact", head: true })
      .eq("business_id", business.id)
      .gte("signed_at", monthStart),
    supabase
      .from("submission")
      .select("id", { count: "exact", head: true })
      .eq("business_id", business.id)
      .gte("signed_at", sevenDaysAgo),
    supabase
      .from("submission")
      .select("id", { count: "exact", head: true })
      .eq("business_id", business.id)
      .gte("signed_at", fourteenDaysAgo)
      .lt("signed_at", sevenDaysAgo),
    // Per-template totals aggregated in SQL (migration 0032): constant payload
    // regardless of how many signatures the business has accumulated.
    supabase.rpc("dashboard_template_stats", { p_business_id: business.id }),
    // Daily buckets in UTC (migration 0035) — feeds the week sparkline.
    supabase.rpc("dashboard_signature_days", {
      p_business_id: business.id,
      p_from: sevenDaysAgo,
    }),
  ]);

  const signatureCountByTemplate = new Map<string, number>();
  const lastSignedByTemplate = new Map<string, string>();
  for (const row of templateStats ?? []) {
    signatureCountByTemplate.set(row.template_id, Number(row.signature_count));
    if (row.last_signed_at) {
      lastSignedByTemplate.set(row.template_id, row.last_signed_at);
    }
  }

  let signaturesToday = 0;
  // 7 daily buckets, oldest → today — feeds the week sparkline in the hero.
  // Days from the RPC are UTC calendar dates (see dashboard_signature_days).
  const weekSeries = [0, 0, 0, 0, 0, 0, 0];
  const dayMs = 24 * 60 * 60 * 1000;
  const todayUtc = new Date();
  todayUtc.setUTCHours(0, 0, 0, 0);
  const todayUtcMs = todayUtc.getTime();
  const todayUtcYmd = todayUtc.toISOString().slice(0, 10);

  for (const row of signatureDays ?? []) {
    const cnt = Number(row.cnt);
    const dayStr =
      typeof row.day === "string"
        ? row.day.slice(0, 10)
        : new Date(row.day).toISOString().slice(0, 10);
    if (dayStr === todayUtcYmd) {
      signaturesToday += cnt;
    }
    const dayMsValue = Date.parse(`${dayStr}T00:00:00.000Z`);
    if (Number.isNaN(dayMsValue)) continue;
    const daysAgo = Math.round((todayUtcMs - dayMsValue) / dayMs);
    if (daysAgo >= 0 && daysAgo < 7) {
      weekSeries[6 - daysAgo] += cnt;
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
        meta: "Toutes les signatures sont réunies — pensez à fermer le groupe.",
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

  // One primary pulse; secondary only adds decision-useful context.
  const weekCount = last7Days ?? 0;
  const monthCount = usedThisMonth ?? 0;
  const weekDelta = weekCount - (prev7Days ?? 0);
  const todayAsPrimary = signaturesToday > 0;

  // Prefer delta, then a single complementary window — max 2 fragments.
  const secondaryParts: string[] = [];
  if (weekDelta > 0) secondaryParts.push(`+${weekDelta} vs sem. préc.`);
  else if (weekDelta < 0) secondaryParts.push(`${weekDelta} vs sem. préc.`);

  if (todayAsPrimary) {
    if (weekCount !== signaturesToday) {
      secondaryParts.push(`${weekCount} cette semaine`);
    }
    if (monthCount !== weekCount && monthCount !== signaturesToday) {
      secondaryParts.push(`${monthCount} ce mois`);
    }
  } else {
    if (signaturesToday > 0) {
      secondaryParts.push(`${signaturesToday} aujourd’hui`);
    }
    if (monthCount !== weekCount) {
      secondaryParts.push(`${monthCount} ce mois`);
    }
  }

  const heroPulse: DashboardHeroPulse = todayAsPrimary
    ? {
        value: signaturesToday,
        label:
          signaturesToday === 1
            ? "signature aujourd’hui"
            : "signatures aujourd’hui",
        secondary:
          secondaryParts.length > 0
            ? secondaryParts.slice(0, 2).join(" · ")
            : undefined,
      }
    : {
        value: weekCount,
        label:
          weekCount === 1
            ? "signature cette semaine"
            : "signatures cette semaine",
        secondary:
          secondaryParts.length > 0
            ? secondaryParts.slice(0, 2).join(" · ")
            : undefined,
      };

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
  const motion =
    "duration-150 ease-[cubic-bezier(0.22,1,0.36,1)]";
  const utilityItem = `inline-flex h-8 items-center gap-1.5 rounded-lg border border-[color-mix(in_srgb,var(--color-border)_55%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_90%,var(--color-surface-2))] px-2.5 text-[12.5px] font-medium tracking-tight text-[var(--color-foreground)]/75 shadow-[var(--elev-1)] transition-[color,background-color,border-color,box-shadow] ${motion} hover:border-[color-mix(in_srgb,var(--color-border)_80%,transparent)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)] hover:shadow-[var(--elev-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]`;

  const signatureCountRecord = Object.fromEntries(signatureCountByTemplate);
  const lastSignedRecord = Object.fromEntries(lastSignedByTemplate);

  return (
    <main className="relative mx-auto flex min-h-screen max-w-3xl flex-col gap-4 px-5 py-7 sm:gap-5 sm:px-6 sm:py-8">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-[radial-gradient(80%_60%_at_50%_-10%,color-mix(in_srgb,var(--color-brand)_9%,transparent),transparent)]"
      />

      <header className="flex items-center justify-between gap-3 border-b border-[color-mix(in_srgb,var(--color-border)_32%,transparent)] pb-2.5 sm:gap-4">
        <BrandLogo href="/dashboard" size="sm" />

        <div className="flex items-center gap-1.5 sm:gap-2">
          <nav aria-label="Compte" className="flex items-center gap-1">
            {hasCapability(membership.role, "manage_members") ? (
              <Link
                href="/dashboard/settings/membres"
                className={utilityItem}
                aria-label="Équipe"
              >
                <Users
                  size={14}
                  strokeWidth={1.85}
                  className="text-[var(--color-muted)]"
                  aria-hidden
                />
                <span className="hidden sm:inline">Équipe</span>
              </Link>
            ) : null}
            {hasCapability(membership.role, "edit_business_info") ? (
              <Link
                href="/dashboard/settings"
                className={utilityItem}
                aria-label="Réglages"
              >
                <Settings
                  size={14}
                  strokeWidth={1.85}
                  className="text-[var(--color-muted)]"
                  aria-hidden
                />
                <span className="hidden sm:inline">Réglages</span>
              </Link>
            ) : null}
            {hasCapability(membership.role, "manage_billing") ? (
              <Link
                href="/dashboard/billing"
                className={utilityItem}
                aria-label="Facturation"
              >
                <CreditCard
                  size={14}
                  strokeWidth={1.85}
                  className="text-[var(--color-muted)]"
                  aria-hidden
                />
                <span className="hidden sm:inline">Facturation</span>
              </Link>
            ) : null}
            <ThemeToggle variant="ghost" />
          </nav>

          <span
            className="mx-0.5 hidden h-4 w-px bg-[color-mix(in_srgb,var(--color-border)_70%,transparent)] sm:block"
            aria-hidden
          />

          <DashboardCreateControl
            canCreateGroup={activeTemplatesList.length > 0}
          />

          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className={`px-1.5 text-[12px] text-[var(--color-muted)]/70 transition-colors ${motion} hover:text-[var(--color-foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]`}
            >
              Quitter
            </button>
          </form>
        </div>
      </header>

      <DashboardBusinessHero
        name={business.name}
        brandColor={business.brand_color}
        planLabel={planLabel}
        isPro={pro}
        lastActivityRelative={lastActivityRelative}
        lastActivityIso={lastActivityIso}
        pulse={heroPulse}
        weekSeries={weekSeries}
        activeWaivers={activeWaivers}
        activeGroups={activeGroups}
        usedThisMonth={usedThisMonth ?? 0}
      />

      <DashboardHome
        attentionItems={visibleAttentionItems}
        active={activeTemplatesList}
        archived={archivedTemplatesList}
        groups={dashboardGroups}
        archivedGroups={archivedDashboardGroups}
        initialView={initialView}
        appUrl={appUrl}
        signatureCountByTemplate={signatureCountRecord}
        lastSignedByTemplate={lastSignedRecord}
      />
    </main>
  );
}
