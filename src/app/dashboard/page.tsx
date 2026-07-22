import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { FREE_MONTHLY_LIMIT, isPro, currentMonthStartISO } from "@/lib/plan";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { StatusBadge } from "@/components/status-badge";
import {
  effectiveTemplateStatus,
  isTemplateStatus,
} from "@/lib/templates";
import { CopyLinkButton } from "./copy-link-button";
import { WaiverActionsMenu } from "./waiver-actions-menu";

function formatRelativeFr(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;

  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "hier";
  if (days < 7) return `il y a ${days} j`;
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function monthDeltaHint(current: number, previous: number): string {
  if (previous === 0 && current === 0) return "En attente d'activité";
  if (previous === 0) return current > 0 ? "Premières signatures" : "—";
  const delta = Math.round(((current - previous) / previous) * 100);
  if (delta === 0) return "Stable vs mois dernier";
  if (delta > 0) return `+${delta} % vs mois dernier`;
  return `${delta} % vs mois dernier`;
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: business } = await supabase
    .from("business")
    .select("id, name")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!business) {
    redirect("/onboarding");
  }

  const { data: templates } = await supabase
    .from("waiver_template")
    .select("id, title, public_slug, status, expires_at, created_at")
    .eq("business_id", business.id)
    .order("created_at", { ascending: false });

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, subscription_status")
    .eq("id", user.id)
    .maybeSingle();

  const pro = isPro(profile);
  const monthStart = currentMonthStartISO();
  const prevMonthStart = new Date(
    new Date(monthStart).getFullYear(),
    new Date(monthStart).getMonth() - 1,
    1,
  ).toISOString();
  const sevenDaysAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const fourteenDaysAgo = new Date(
    Date.now() - 14 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const [
    { count: usedThisMonth },
    { count: totalSignatures },
    { count: last7Days },
    { count: prev7Days },
    { count: prevMonthCount },
    { data: submissions },
  ] = await Promise.all([
    supabase
      .from("submission")
      .select("id", { count: "exact", head: true })
      .eq("business_id", business.id)
      .gte("signed_at", monthStart),
    supabase
      .from("submission")
      .select("id", { count: "exact", head: true })
      .eq("business_id", business.id),
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
    supabase
      .from("submission")
      .select("id", { count: "exact", head: true })
      .eq("business_id", business.id)
      .gte("signed_at", prevMonthStart)
      .lt("signed_at", monthStart),
    supabase
      .from("submission")
      .select("template_id, signed_at")
      .eq("business_id", business.id)
      .order("signed_at", { ascending: false }),
  ]);

  const signatureCountByTemplate = new Map<string, number>();
  const lastSignedByTemplate = new Map<string, string>();
  for (const s of submissions ?? []) {
    signatureCountByTemplate.set(
      s.template_id,
      (signatureCountByTemplate.get(s.template_id) ?? 0) + 1,
    );
    if (!lastSignedByTemplate.has(s.template_id)) {
      lastSignedByTemplate.set(s.template_id, s.signed_at);
    }
  }

  const activeTemplates =
    templates?.filter((t) => {
      if (!isTemplateStatus(t.status)) return false;
      return (
        effectiveTemplateStatus({
          status: t.status,
          expires_at: t.expires_at,
        }) === "open"
      );
    }).length ?? 0;
  const totalTemplates = templates?.length ?? 0;
  const latestSignature = submissions?.[0] ?? null;
  const latestTemplate = templates?.[0] ?? null;
  const latestSignatureRelative = formatRelativeFr(latestSignature?.signed_at);

  const weekDelta = (last7Days ?? 0) - (prev7Days ?? 0);
  const weekHint =
    (last7Days ?? 0) === 0 && (prev7Days ?? 0) === 0
      ? "Aucune signature récente"
      : weekDelta === 0
        ? "Stable vs semaine préc."
        : weekDelta > 0
          ? `+${weekDelta} vs semaine préc.`
          : `${weekDelta} vs semaine préc.`;

  const stats = [
    {
      label: "Signatures ce mois",
      value: usedThisMonth ?? 0,
      hint: pro
        ? monthDeltaHint(usedThisMonth ?? 0, prevMonthCount ?? 0)
        : `${usedThisMonth ?? 0} / ${FREE_MONTHLY_LIMIT} gratuites`,
      icon: (
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M16 3v4M8 3v4M3 11h18" />
        </svg>
      ),
    },
    {
      label: "7 derniers jours",
      value: last7Days ?? 0,
      hint: weekHint,
      icon: (
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      ),
    },
    {
      label: "Total signatures",
      value: totalSignatures ?? 0,
      hint: latestSignatureRelative
        ? `Dernière ${latestSignatureRelative}`
        : "En attente de la première",
      icon: (
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M12 19l7-7 3 3-7 7-3-3z" />
          <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
          <path d="M2 2l7.586 7.586" />
        </svg>
      ),
    },
    {
      label: "Décharges actives",
      value: activeTemplates,
      hint:
        totalTemplates === 0
          ? "Créez votre première"
          : `${activeTemplates} sur ${totalTemplates}`,
      icon: (
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
          <path d="M9 13h6M9 17h6" />
        </svg>
      ),
    },
  ];

  const planLabel = pro ? "Plan Pro" : "Plan Gratuit";
  const lastActivityIso = (() => {
    const times = [latestSignature?.signed_at, latestTemplate?.created_at]
      .filter((v): v is string => Boolean(v))
      .map((v) => new Date(v).getTime())
      .filter((n) => !Number.isNaN(n));
    if (times.length === 0) return null;
    return new Date(Math.max(...times)).toISOString();
  })();
  const lastActivityRelative = formatRelativeFr(lastActivityIso);

  const appUrl = env.appUrl;
  const motion =
    "duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]";
  /* Surface ladder: page (0) → stats (2) → waivers (3) → controls (4) */
  const statCard =
    "border border-[color-mix(in_srgb,var(--color-border)_70%,transparent)] bg-[var(--color-surface)] shadow-[var(--elev-2)]";
  const waiverCard =
    "border border-[color-mix(in_srgb,var(--color-border)_82%,var(--color-foreground))] bg-[var(--color-surface)] shadow-[var(--elev-3)]";
  const cardHover = `transition-[transform,box-shadow,border-color] ${motion} hover:-translate-y-px hover:border-[color-mix(in_srgb,var(--color-brand)_18%,var(--color-border))] hover:shadow-[var(--elev-hover)]`;
  const primaryBtn = `shadow-[0_1px_0_rgba(255,255,255,0.12)_inset,var(--elev-1)] transition-[transform,box-shadow,filter] ${motion} hover:-translate-y-px hover:brightness-[1.04] hover:shadow-[0_1px_0_rgba(255,255,255,0.16)_inset,0_8px_20px_-8px_color-mix(in_srgb,var(--color-brand)_48%,transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] active:translate-y-0 active:scale-[0.985]`;
  const secondaryBtn = `inline-flex h-9 items-center rounded-lg border border-[color-mix(in_srgb,var(--color-brand)_35%,var(--color-border))] bg-[var(--color-surface)] px-3.5 text-sm font-medium text-[var(--color-brand)] shadow-[var(--elev-1)] transition-[transform,background-color,border-color,color,box-shadow] ${motion} hover:-translate-y-px hover:border-[var(--color-brand)] hover:bg-[var(--color-brand)] hover:text-[var(--color-on-brand)] hover:shadow-[0_6px_16px_-8px_color-mix(in_srgb,var(--color-brand)_40%,transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] active:translate-y-0 active:scale-[0.985]`;
  const navLink = `rounded-lg px-2 py-1.5 text-sm text-[var(--color-muted)] transition-[color,background-color] ${motion} hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]`;
  const ghostBtn = `rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm font-medium shadow-[var(--elev-1)] transition-[background-color,border-color,transform,box-shadow] ${motion} hover:border-[color-mix(in_srgb,var(--color-border)_55%,var(--color-muted))] hover:bg-[var(--color-surface-2)] hover:shadow-[var(--elev-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] active:scale-[0.985]`;

  const metaParts = [
    `${activeTemplates} décharge${activeTemplates === 1 ? "" : "s"} active${activeTemplates === 1 ? "" : "s"}`,
    `${usedThisMonth ?? 0} signature${(usedThisMonth ?? 0) === 1 ? "" : "s"} ce mois`,
  ];

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-5 py-10 sm:gap-9 sm:px-6 sm:py-12">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[color-mix(in_srgb,var(--color-border)_55%,transparent)] pb-5">
        <BrandLogo href="/dashboard" />
        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-2.5">
          <Link href="/dashboard/signatures" className={navLink}>
            Signatures
          </Link>
          <Link
            href="/dashboard/settings"
            className={`hidden sm:inline ${navLink}`}
          >
            Réglages
          </Link>
          <Link
            href="/dashboard/billing"
            className={`flex items-center gap-2 ${navLink}`}
          >
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-[background-color,color] ${motion} ${
                pro
                  ? "bg-[color-mix(in_srgb,var(--color-brand)_18%,transparent)] text-[var(--color-brand)]"
                  : "bg-[var(--color-surface-2)] text-[var(--color-muted)]"
              }`}
            >
              {pro
                ? "Pro"
                : `Gratuit ${usedThisMonth ?? 0}/${FREE_MONTHLY_LIMIT}`}
            </span>
            <span className="hidden sm:inline">Facturation</span>
          </Link>
          <ThemeToggle />
          <Link
            href="/dashboard/waivers/new"
            className={`inline-flex h-9 items-center rounded-lg bg-[var(--color-brand)] px-3.5 text-sm font-medium tracking-tight text-[var(--color-on-brand)] ${primaryBtn}`}
          >
            + Nouvelle décharge
          </Link>
          <form action="/auth/signout" method="post">
            <button type="submit" className={ghostBtn}>
              Déconnexion
            </button>
          </form>
        </div>
      </header>

      <section className="animate-fade-up flex flex-col">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2.5">
              <h1 className="text-[1.625rem] font-semibold tracking-tight text-[var(--color-foreground)] sm:text-2xl">
                {business.name}
              </h1>
              <span
                className={`rounded-md px-2 py-[3px] text-[11px] font-semibold tracking-wide transition-[background-color,box-shadow] ${motion} ${
                  pro
                    ? "bg-[color-mix(in_srgb,var(--color-brand)_14%,transparent)] text-[var(--color-brand)] ring-1 ring-[color-mix(in_srgb,var(--color-brand)_26%,transparent)]"
                    : "bg-[var(--color-surface-2)] text-[var(--color-muted)] ring-1 ring-[color-mix(in_srgb,var(--color-border)_75%,transparent)]"
                }`}
              >
                {planLabel}
              </span>
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-[var(--color-muted)] sm:text-sm">
              {metaParts.join(" · ")}
            </p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--color-muted)]">
              {lastActivityRelative
                ? `Dernière activité ${lastActivityRelative}`
                : "Aucune activité pour le moment — créez votre première décharge."}
            </p>
          </div>
          <Link
            href="/dashboard/settings"
            className={`sm:hidden ${navLink}`}
          >
            Réglages
          </Link>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--color-muted)]">
            Aperçu
          </h2>
          <span
            className="h-px flex-1 bg-[color-mix(in_srgb,var(--color-border)_55%,transparent)]"
            aria-hidden
          />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-3">
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className={`flex flex-col gap-0.5 rounded-[1.05rem] px-3.5 py-3 animate-fade-up sm:px-4 sm:py-3.5 ${statCard} ${cardHover}`}
              style={{ animationDelay: `${index * 40}ms` }}
            >
              <div className="mb-0.5 flex items-start justify-between gap-2">
                <span className="text-[1.45rem] font-semibold tracking-tight tabular-nums leading-none text-[var(--color-foreground)] sm:text-[1.55rem]">
                  {stat.value}
                </span>
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[color-mix(in_srgb,var(--color-brand)_12%,transparent)] text-[var(--color-brand)] transition-[background-color,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]">
                  {stat.icon}
                </span>
              </div>
              <span className="mt-1 text-[11px] font-medium text-[var(--color-foreground)]/88">
                {stat.label}
              </span>
              <span className="text-[11px] leading-snug text-[var(--color-muted)]">
                {stat.hint}
              </span>
            </div>
          ))}
        </div>
      </section>

      {!templates || templates.length === 0 ? (
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--color-muted)]">
              Décharges
            </h2>
            <span
              className="h-px flex-1 bg-[color-mix(in_srgb,var(--color-border)_55%,transparent)]"
              aria-hidden
            />
          </div>
          <div
            className={`flex flex-col items-center gap-5 rounded-[1.35rem] border border-[color-mix(in_srgb,var(--color-border)_82%,var(--color-foreground))] bg-[var(--color-surface)] px-6 py-10 text-center shadow-[var(--elev-3)] animate-fade-up sm:px-10 sm:py-12`}
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--color-brand)_12%,transparent)] text-[var(--color-brand)]">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <path d="M14 2v6h6" />
                <path d="M9 13h6M9 17h4" />
                <path d="M12 9v.01" />
              </svg>
            </div>
            <div className="flex max-w-sm flex-col gap-2">
              <p className="text-base font-semibold tracking-tight">
                Aucune décharge pour l&apos;instant
              </p>
              <p className="text-sm leading-relaxed text-[var(--color-muted)]">
                Créez votre première décharge en quelques secondes à partir
                d&apos;un modèle prêt à l&apos;emploi — escape game, sport,
                enfants et plus.
              </p>
            </div>
            <Link
              href="/onboarding/premiere-decharge"
              className={`inline-flex min-h-11 items-center rounded-xl bg-[var(--color-brand)] px-5 py-2.5 text-sm font-medium text-[var(--color-on-brand)] ${primaryBtn}`}
            >
              Créer ma première décharge
            </Link>
          </div>
        </section>
      ) : (
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--color-muted)]">
              Décharges
              <span className="ml-1.5 font-normal normal-case tracking-normal text-[var(--color-muted)]">
                ({totalTemplates})
              </span>
            </h2>
            <span
              className="h-px flex-1 bg-[color-mix(in_srgb,var(--color-border)_55%,transparent)]"
              aria-hidden
            />
          </div>
          <ul className="flex flex-col gap-2.5">
            {templates.map((t, index) => {
              const publicUrl = `${appUrl}/w/${t.public_slug}`;
              const count = signatureCountByTemplate.get(t.id) ?? 0;
              const lastSigned = formatRelativeFr(
                lastSignedByTemplate.get(t.id),
              );
              const created = formatShortDate(t.created_at);

              return (
                <li
                  key={t.id}
                  className={`relative z-0 rounded-[1.2rem] px-4 py-3.5 animate-fade-up hover:z-10 has-[[aria-expanded=true]]:z-30 sm:px-5 sm:py-4 ${waiverCard} ${cardHover}`}
                  style={{ animationDelay: `${80 + index * 45}ms` }}
                >
                  <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <div className="flex min-w-0 flex-col gap-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-[15px] font-semibold tracking-tight sm:text-base">
                          {t.title}
                        </h3>
                        <StatusBadge
                          status={
                            isTemplateStatus(t.status)
                              ? effectiveTemplateStatus({
                                  status: t.status,
                                  expires_at: t.expires_at,
                                })
                              : "inactive"
                          }
                        />
                      </div>

                      <p
                        className={`text-[13px] font-medium tabular-nums ${
                          count > 0
                            ? "text-[var(--color-brand)]"
                            : "text-[var(--color-foreground)]/70"
                        }`}
                      >
                        {count} signature{count > 1 ? "s" : ""}
                      </p>

                      <p className="text-[12px] leading-relaxed text-[var(--color-muted)]">
                        <span>Créée {created}</span>
                        <span aria-hidden className="mx-1.5">
                          ·
                        </span>
                        <span>
                          {lastSigned
                            ? `Dernière signature ${lastSigned}`
                            : "Jamais signée"}
                        </span>
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <CopyLinkButton url={publicUrl} variant="icon" />
                      <Link
                        href={`/dashboard/waivers/${t.id}`}
                        className={secondaryBtn}
                      >
                        Voir
                      </Link>
                      <WaiverActionsMenu
                        id={t.id}
                        title={t.title}
                        submissionCount={count}
                      />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </main>
  );
}
