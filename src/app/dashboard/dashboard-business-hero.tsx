"use client";

import Link from "next/link";
import { RoleBadge, type RoleId } from "./settings/membres/roles";
import { motion, useReducedMotion } from "framer-motion";
import { Archive, PenLine, Search, Users } from "lucide-react";
import { useState, useEffect } from "react";
import { useCommandPalette } from "@/components/command-palette";
import { FREE_MONTHLY_LIMIT } from "@/lib/plan";
import {
  DASHBOARD_ENTRANCE_DURATION,
  DASHBOARD_ENTRANCE_EASE,
  DashboardEntrance,
} from "./dashboard-entrance";

/**
 * Command Launcher — Compact, minimal, premium entry point to the command palette.
 *
 * Design Philosophy:
 * - Quality through precision, not effects
 * - Clean, confident rectangle — no orb, no animation
 * - Perfect spacing and typography
 * - macOS-style keycap badge with physical depth
 * - Understated elevation — felt, not seen
 *
 * This launcher earns attention through execution, not size.
 */
function HeroSearchButton({ onClick }: { onClick: () => void }) {
  const [modifier, setModifier] = useState<string>("⌘");

  useEffect(() => {
    if (!/Mac|iPhone|iPad/i.test(navigator.userAgent)) {
      setModifier("Ctrl");
    }
  }, []);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Ouvrir la palette de commandes (⌘K)"
      className="group relative flex h-[42px] min-w-[48px] shrink-0 items-center gap-2.5 overflow-hidden rounded-[13px] bg-[var(--color-brand)] pl-3.5 pr-2.5 text-white shadow-[0_1px_6px_color-mix(in_srgb,var(--color-brand)_28%,transparent),0_4px_14px_color-mix(in_srgb,var(--color-brand)_16%,transparent)] transition-[transform,box-shadow] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[1.5px] hover:shadow-[0_2px_8px_color-mix(in_srgb,var(--color-brand)_36%,transparent),0_6px_20px_color-mix(in_srgb,var(--color-brand)_22%,transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] active:translate-y-0 active:scale-[0.97]"
    >
      {/* Subtle radial gradient for depth */}
      <span
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(130%_90%_at_30%_0%,rgba(255,255,255,0.1),transparent_60%)]"
        aria-hidden
      />
      {/* Inner glow — light from above */}
      <span
        className="pointer-events-none absolute inset-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]"
        aria-hidden
      />

      <Search
        size={13}
        strokeWidth={2.4}
        className="relative z-[1] shrink-0 opacity-90"
        aria-hidden
      />

      <span className="hidden text-[12.5px] font-medium tracking-[-0.005em] sm:inline">
        Palette de commandes
      </span>

      <kbd className="relative flex select-none items-center rounded-[7px] bg-black/[0.22] px-2 py-[4.5px] font-[inherit] text-[10px] font-semibold leading-none tracking-[0.03em] text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.2),inset_0_-1.5px_0_rgba(0,0,0,0.25),0_0_0_0.5px_rgba(0,0,0,0.12)]">
        {modifier}K
      </kbd>
    </button>
  );
}

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
      className="group flex min-w-0 flex-1 items-center gap-3.5 rounded-xl border border-[color-mix(in_srgb,var(--color-border)_55%,transparent)] bg-[color-mix(in_srgb,var(--color-surface-2)_45%,var(--color-surface))] px-4 py-3.5 transition-[transform,border-color,box-shadow,background-color] duration-150 hover:-translate-y-px hover:border-[color-mix(in_srgb,var(--color-brand)_45%,transparent)] hover:bg-[var(--color-surface)] hover:shadow-[var(--elev-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] lg:px-4.5 lg:py-4"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--color-brand)_11%,transparent)] text-[var(--color-brand)] transition-colors duration-150 group-hover:bg-[color-mix(in_srgb,var(--color-brand)_17%,transparent)] lg:h-11 lg:w-11">
        <Icon size={18} strokeWidth={1.8} aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[14px] font-medium tracking-tight text-[var(--color-foreground)] lg:text-[14.5px]">
          {label}
        </span>
        <span className="mt-0.5 block truncate text-[12.5px] leading-snug text-[var(--color-muted)] lg:text-[13px]">
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
  const { setOpen } = useCommandPalette();
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
      className={`relative overflow-hidden rounded-[1.5rem] border bg-[var(--color-surface)] shadow-[var(--elev-3)] ${
        isPro
          ? "border-[color-mix(in_srgb,var(--color-brand)_18%,var(--color-border))] ring-1 ring-[color-mix(in_srgb,var(--color-brand)_10%,transparent)]"
          : "border-[color-mix(in_srgb,var(--color-border)_50%,transparent)] ring-1 ring-black/[0.02] dark:ring-white/[0.045]"
      }`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background: `radial-gradient(80% 65% at 8% -5%, color-mix(in srgb, ${brand} ${isPro ? "18%" : "14%"}, transparent), transparent 58%)`,
        }}
      />

      <div className="relative flex flex-col gap-4 p-5 sm:gap-[1.3rem] sm:p-6 lg:p-7">
        <DashboardEntrance step={0} className="flex flex-col gap-2 sm:gap-3">
          {/* Top row: plan badge (left) + premium search trigger (right) */}
          <div className="flex items-center justify-between gap-x-3 gap-y-1">
            {isPro ? (
              <span className="inline-flex items-center rounded-md bg-[color-mix(in_srgb,var(--color-brand)_12%,transparent)] px-2 py-[3px] text-[11px] font-semibold tracking-[0.06em] text-[var(--color-brand)] ring-1 ring-[color-mix(in_srgb,var(--color-brand)_22%,transparent)]">
                Pro
              </span>
            ) : (
              <span className="text-[12px] font-medium tracking-tight text-[var(--color-muted)]/85">
                {planLabel}
              </span>
            )}

            <HeroSearchButton onClick={() => setOpen(true)} />
          </div>

          <div className="flex flex-col gap-[0.45rem]">
            <h1
              className={`max-w-full break-words text-[var(--color-foreground)] [font-feature-settings:"kern"_1,"liga"_1] [font-optical-sizing:auto] sm:whitespace-nowrap ${
                isPro
                  ? "text-[1.7rem] font-semibold leading-[1.04] tracking-[-0.021em] sm:text-[2.35rem] sm:leading-none sm:tracking-[-0.025em] lg:text-[2.5rem] lg:tracking-[-0.026em]"
                  : "text-[1.65rem] font-semibold leading-[1.04] tracking-[-0.018em] sm:text-[2.15rem] sm:leading-none sm:tracking-[-0.023em] lg:text-[2.3rem] lg:tracking-[-0.024em]"
              }`}
              title={name}
            >
              {name}
            </h1>
            {/* Qui je suis, ici. Sur un espace partagé, savoir sous quel rôle
                on agit évite de chercher pourquoi une action manque — et sa
                place est auprès du nom de l'établissement, pas dans la barre
                d'outils au milieu des actions. */}
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 pt-1">
              <RoleBadge role={role} showSummary={false} />
              {viewerName ? (
                <span className="text-[13.5px] text-[var(--color-muted)]">
                  {viewerName}
                </span>
              ) : null}
            </div>
            <InventorySummary
              activeWaivers={activeWaivers}
              activeGroups={activeGroups}
            />
            {/* Activity meta: only shown when data is stale (≥ 24 h).
                Moved here from the top row to free it for the search button. */}
            {showActivityMeta ? (
              <p className="text-[12px] text-[var(--color-muted)]/70">
                {lastActivityRelative
                  ? `Dernière activité ${lastActivityRelative}`
                  : "En attente de la première signature"}
              </p>
            ) : null}
          </div>

          {!isPro && freePct !== null ? (
            <div className="hidden max-w-[14rem] pt-1 sm:block">
              <div className="mb-1.5 flex items-baseline justify-between gap-2 text-[11.5px]">
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
                className="h-[3.5px] overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--color-surface-2)_80%,var(--color-foreground))]"
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
            className="flex flex-col gap-2.5 border-t border-[color-mix(in_srgb,var(--color-border)_42%,transparent)] pt-4 sm:flex-row sm:gap-3 sm:pt-5 lg:gap-3.5"
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
