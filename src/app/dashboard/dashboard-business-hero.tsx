"use client";

import Link from "next/link";
import { RoleBadge, type RoleId } from "./settings/membres/roles";
import { motion, useReducedMotion } from "framer-motion";
import { Archive, PenLine, Users } from "lucide-react";
import { FREE_MONTHLY_LIMIT } from "@/lib/plan";
import {
  DASHBOARD_ENTRANCE_DURATION,
  DASHBOARD_ENTRANCE_EASE,
  DashboardEntrance,
} from "./dashboard-entrance";

/**
 * The three places a manager actually needs to reach from the dashboard.
 * They replace the week counter, the delta and the sparkline: those described
 * the past without offering anything to do about it, and a control centre is
 * judged on how fast it gets you somewhere.
 */
const CONTROLS = [
  {
    href: "/dashboard/settings/membres",
    icon: Users,
    label: "Équipe",
    hint: "Accès & rôles",
  },
  {
    href: "/dashboard/signatures",
    icon: PenLine,
    label: "Toutes les signatures",
    hint: "Rechercher et exporter",
  },
  {
    href: "/dashboard/archives",
    icon: Archive,
    label: "Archives",
    hint: "Formulaires et sessions",
  },
] as const;

function ControlTile({
  href,
  icon: Icon,
  label,
  hint,
}: (typeof CONTROLS)[number]) {
  return (
    <Link
      href={href}
      className="group flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-[color-mix(in_srgb,var(--color-border)_55%,transparent)] bg-[color-mix(in_srgb,var(--color-surface-2)_45%,var(--color-surface))] px-3.5 py-3 transition-[transform,border-color,box-shadow,background-color] duration-150 hover:-translate-y-px hover:border-[color-mix(in_srgb,var(--color-brand)_45%,transparent)] hover:bg-[var(--color-surface)] hover:shadow-[var(--elev-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--color-brand)_11%,transparent)] text-[var(--color-brand)] transition-colors duration-150 group-hover:bg-[color-mix(in_srgb,var(--color-brand)_17%,transparent)]">
        <Icon size={17} strokeWidth={1.8} aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[13.5px] font-medium tracking-tight text-[var(--color-foreground)]">
          {label}
        </span>
        <span className="mt-0.5 block truncate text-[12px] leading-snug text-[var(--color-muted)]">
          {hint}
        </span>
      </span>
    </Link>
  );
}

function InventorySummary({
  activeWaivers,
  activeGroups,
}: {
  activeWaivers: number;
  activeGroups: number;
}) {
  if (activeWaivers === 0 && activeGroups === 0) {
    return (
      <p className="text-[13.5px] leading-snug tracking-tight text-[var(--color-muted)]">
        Aucun formulaire ni session ouverte
      </p>
    );
  }

  const waiverLabel =
    activeWaivers <= 1 ? "formulaire ouvert" : "formulaires ouverts";
  const groupLabel =
    activeGroups <= 1 ? "session ouverte" : "sessions ouvertes";

  return (
    <p
      className="flex flex-wrap items-baseline gap-y-0.5 text-[13.5px] leading-snug tracking-tight text-[color-mix(in_srgb,var(--color-foreground)_55%,var(--color-muted))]"
      aria-label={`${activeWaivers} ${waiverLabel}, ${activeGroups} ${groupLabel}`}
    >
      <span>
        <span className="font-semibold tabular-nums text-[color-mix(in_srgb,var(--color-foreground)_78%,var(--color-muted))]">
          {activeWaivers}
        </span>
        {` ${waiverLabel}`}
      </span>
      <span
        className="mx-2.5 hidden select-none text-[var(--color-muted)]/40 sm:inline"
        aria-hidden
      >
        ·
      </span>
      <span className="hidden sm:inline">
        <span className="font-semibold tabular-nums text-[color-mix(in_srgb,var(--color-foreground)_78%,var(--color-muted))]">
          {activeGroups}
        </span>
        {` ${groupLabel}`}
      </span>
    </p>
  );
}

/**
 * Business identity and the control centre: who the space belongs to, what is
 * open right now, and the three destinations that matter.
 */
export function DashboardBusinessHero({
  name,
  brandColor,
  planLabel,
  isPro,
  lastActivityRelative,
  lastActivityIso,
  activeWaivers,
  activeGroups,
  usedThisMonth,
  role,
  viewerName,
}: {
  name: string;
  brandColor?: string | null;
  planLabel: string;
  isPro: boolean;
  lastActivityRelative: string | null;
  lastActivityIso: string | null;
  activeWaivers: number;
  activeGroups: number;
  usedThisMonth: number;
  /** Rôle de la personne connectée, dans cet espace. */
  role: RoleId;
  /** Prénom ou nom affiché de la personne connectée, si connu. */
  viewerName: string | null;
}) {
  const reduced = useReducedMotion() ?? false;
  const freePct = isPro
    ? null
    : Math.min(100, Math.round((usedThisMonth / FREE_MONTHLY_LIMIT) * 100));
  const nearLimit = freePct !== null && freePct >= 80;

  // Pulse already signals recent activity — only surface stale / empty states.
  const showActivityMeta = (() => {
    if (!lastActivityIso) return true;
    const ms = Date.now() - new Date(lastActivityIso).getTime();
    if (Number.isNaN(ms) || ms < 0) return false;
    return ms >= 24 * 60 * 60 * 1000;
  })();

  const brand = brandColor || "var(--color-brand)";

  return (
    <section
      aria-label={name}
      className={`relative overflow-hidden rounded-[1.4rem] border bg-[var(--color-surface)] shadow-[var(--elev-3)] ${
        isPro
          ? "border-[color-mix(in_srgb,var(--color-brand)_18%,var(--color-border))] ring-1 ring-[color-mix(in_srgb,var(--color-brand)_10%,transparent)]"
          : "border-[color-mix(in_srgb,var(--color-border)_50%,transparent)] ring-1 ring-black/[0.02] dark:ring-white/[0.045]"
      }`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background: `radial-gradient(85% 70% at 8% -5%, color-mix(in srgb, ${brand} ${isPro ? "18%" : "14%"}, transparent), transparent 58%)`,
        }}
      />

      <div className="relative flex flex-col gap-3 p-4 sm:gap-[1.15rem] sm:p-5">
        <DashboardEntrance step={0} className="flex flex-col gap-2 sm:gap-2.5">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            {isPro ? (
              <span className="inline-flex items-center rounded-md bg-[color-mix(in_srgb,var(--color-brand)_12%,transparent)] px-2 py-[3px] text-[11px] font-semibold tracking-[0.06em] text-[var(--color-brand)] ring-1 ring-[color-mix(in_srgb,var(--color-brand)_22%,transparent)]">
                Pro
              </span>
            ) : (
              <span className="text-[12px] font-medium tracking-tight text-[var(--color-muted)]/85">
                {planLabel}
              </span>
            )}

            {showActivityMeta ? (
              <p className="hidden text-[12px] text-[var(--color-muted)]/80 sm:block">
                {lastActivityRelative
                  ? `Dernière activité ${lastActivityRelative}`
                  : "En attente de la première signature"}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-[0.4rem]">
            <h1
              className={`max-w-full break-words text-[var(--color-foreground)] [font-feature-settings:"kern"_1,"liga"_1] [font-optical-sizing:auto] sm:whitespace-nowrap ${
                isPro
                  ? "text-[1.65rem] font-semibold leading-[1.04] tracking-[-0.021em] sm:text-[2.2rem] sm:leading-none sm:tracking-[-0.024em]"
                  : "text-[1.6rem] font-semibold leading-[1.04] tracking-[-0.018em] sm:text-[2.05rem] sm:leading-none sm:tracking-[-0.022em]"
              }`}
              title={name}
            >
              {name}
            </h1>
            {/* Qui je suis, ici. Sur un espace partagé, savoir sous quel rôle
                on agit évite de chercher pourquoi une action manque — et sa
                place est auprès du nom de l'établissement, pas dans la barre
                d'outils au milieu des actions. */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-0.5">
              <RoleBadge role={role} showSummary={false} />
              {viewerName ? (
                <span className="text-[13px] text-[var(--color-muted)]">
                  {viewerName}
                </span>
              ) : null}
            </div>
            <InventorySummary
              activeWaivers={activeWaivers}
              activeGroups={activeGroups}
            />
          </div>

          {!isPro && freePct !== null ? (
            <div className="hidden max-w-[13rem] pt-0.5 sm:block">
              <div className="mb-1 flex items-baseline justify-between gap-2 text-[11px]">
                <span className="text-[var(--color-muted)]">Quota du mois</span>
                <span
                  className={`tabular-nums font-medium ${
                    nearLimit
                      ? "text-[color-mix(in_srgb,#b45309_88%,var(--color-muted))]"
                      : "text-[var(--color-foreground)]/65"
                  }`}
                >
                  {usedThisMonth}/{FREE_MONTHLY_LIMIT}
                </span>
              </div>
              <div
                className="h-[3px] overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--color-surface-2)_80%,var(--color-foreground))]"
                role="progressbar"
                aria-valuenow={freePct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${usedThisMonth} sur ${FREE_MONTHLY_LIMIT} signatures ce mois`}
              >
                <motion.div
                  className={`h-full rounded-full ${
                    nearLimit
                      ? "bg-[color-mix(in_srgb,#b45309_90%,var(--color-brand))]"
                      : "bg-[var(--color-brand)]"
                  }`}
                  initial={reduced ? false : { width: 0 }}
                  animate={{ width: `${freePct}%` }}
                  transition={{
                    duration: DASHBOARD_ENTRANCE_DURATION,
                    delay: reduced ? 0 : 0.08,
                    ease: DASHBOARD_ENTRANCE_EASE,
                  }}
                />
              </div>
            </div>
          ) : null}
        </DashboardEntrance>

        <DashboardEntrance step={1}>
          <nav
            className="flex flex-col gap-2 border-t border-[color-mix(in_srgb,var(--color-border)_42%,transparent)] pt-3 sm:flex-row sm:gap-2.5 sm:pt-4"
            aria-label="Accès rapides"
          >
            {CONTROLS.map((c) => (
              <ControlTile key={c.href} {...c} />
            ))}
          </nav>
        </DashboardEntrance>
      </div>
    </section>
  );
}
