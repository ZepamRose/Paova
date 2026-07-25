"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { FREE_MONTHLY_LIMIT } from "@/lib/plan";
import type { DashboardHeroPulse } from "@/lib/dashboard/types";
import {
  DASHBOARD_ENTRANCE_DURATION,
  DASHBOARD_ENTRANCE_EASE,
  DASHBOARD_ENTRANCE_STAGGER,
  DashboardEntrance,
} from "./dashboard-entrance";

function useCountUp(target: number, durationMs = 420, delayMs = 0) {
  const [value, setValue] = useState(0);
  const played = useRef(false);
  const reduced = useReducedMotion() ?? false;

  useEffect(() => {
    if (played.current) {
      setValue(target);
      return;
    }
    played.current = true;
    if (reduced || target <= 0) {
      setValue(target);
      return;
    }

    let raf = 0;
    let start = 0;
    const timeout = window.setTimeout(() => {
      start = performance.now();
      function tick(now: number) {
        const t = Math.min(1, (now - start) / durationMs);
        const eased = 1 - (1 - t) ** 3;
        setValue(Math.round(target * eased));
        if (t < 1) raf = requestAnimationFrame(tick);
      }
      raf = requestAnimationFrame(tick);
    }, delayMs);

    return () => {
      window.clearTimeout(timeout);
      cancelAnimationFrame(raf);
    };
  }, [target, durationMs, delayMs, reduced]);

  return value;
}

function WeekSparkline({ series }: { series: number[] }) {
  const max = Math.max(1, ...series);
  return (
    <div
      className="flex h-9 items-end gap-[3px] sm:h-10"
      aria-hidden
      title="Signatures sur 7 jours"
    >
      {series.map((n, i) => {
        const h = Math.max(3, Math.round((n / max) * 32));
        const isLast = i === series.length - 1;
        return (
          <span
            key={i}
            className={`w-[4px] rounded-[1.5px] sm:w-[5px] ${
              isLast
                ? "bg-[var(--color-brand)]"
                : n > 0
                  ? "bg-[color-mix(in_srgb,var(--color-brand)_40%,var(--color-muted))]"
                  : "bg-[color-mix(in_srgb,var(--color-foreground)_10%,transparent)]"
            }`}
            style={{ height: h }}
          />
        );
      })}
    </div>
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
        Aucune décharge ni groupe ouvert
      </p>
    );
  }

  const waiverLabel =
    activeWaivers <= 1 ? "décharge ouverte" : "décharges ouvertes";
  const groupLabel =
    activeGroups <= 1 ? "groupe ouvert" : "groupes ouverts";

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
        className="mx-2.5 select-none text-[var(--color-muted)]/40"
        aria-hidden
      >
        ·
      </span>
      <span>
        <span className="font-semibold tabular-nums text-[color-mix(in_srgb,var(--color-foreground)_78%,var(--color-muted))]">
          {activeGroups}
        </span>
        {` ${groupLabel}`}
      </span>
    </p>
  );
}

/**
 * Business identity + a single operational pulse.
 * One dominant number, quiet context — no nested KPI card.
 */
export function DashboardBusinessHero({
  name,
  brandColor,
  planLabel,
  isPro,
  lastActivityRelative,
  lastActivityIso,
  pulse,
  weekSeries,
  activeWaivers,
  activeGroups,
  usedThisMonth,
}: {
  name: string;
  brandColor?: string | null;
  planLabel: string;
  isPro: boolean;
  lastActivityRelative: string | null;
  lastActivityIso: string | null;
  pulse: DashboardHeroPulse;
  weekSeries: number[];
  activeWaivers: number;
  activeGroups: number;
  usedThisMonth: number;
}) {
  const reduced = useReducedMotion() ?? false;
  const display = useCountUp(
    pulse.value,
    420,
    Math.round(DASHBOARD_ENTRANCE_STAGGER * 1000) + 50,
  );
  const freePct = isPro
    ? null
    : Math.min(100, Math.round((usedThisMonth / FREE_MONTHLY_LIMIT) * 100));
  const nearLimit = freePct !== null && freePct >= 80;
  const showSpark = weekSeries.length === 7;

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

      <div className="relative flex flex-col gap-4 p-4 sm:gap-[1.15rem] sm:p-5">
        <DashboardEntrance step={0} className="flex flex-col gap-2.5">
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
              <p className="text-[12px] text-[var(--color-muted)]/80">
                {lastActivityRelative
                  ? `Dernière activité ${lastActivityRelative}`
                  : "En attente de la première signature"}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-[0.4rem]">
            <h1
              className={`whitespace-nowrap text-[var(--color-foreground)] [font-feature-settings:"kern"_1,"liga"_1] [font-optical-sizing:auto] ${
                isPro
                  ? "text-[1.95rem] font-semibold leading-none tracking-[-0.021em] sm:text-[2.2rem] sm:tracking-[-0.024em]"
                  : "text-[1.85rem] font-semibold leading-none tracking-[-0.018em] sm:text-[2.05rem] sm:tracking-[-0.022em]"
              }`}
              title={name}
            >
              {name}
            </h1>
            <InventorySummary
              activeWaivers={activeWaivers}
              activeGroups={activeGroups}
            />
          </div>

          {!isPro && freePct !== null ? (
            <div className="max-w-[13rem] pt-0.5">
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
          <div
            className="flex flex-col gap-3 border-t border-[color-mix(in_srgb,var(--color-border)_42%,transparent)] pt-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6"
            aria-label="Activité récente"
          >
            <div className="min-w-0">
              <p className="text-[2.45rem] font-semibold tracking-tight tabular-nums leading-none text-[var(--color-foreground)] sm:text-[2.75rem]">
                {display}
              </p>
              <p className="mt-1.5 text-[13px] tracking-tight text-[var(--color-muted)]">
                {pulse.label}
              </p>
              {pulse.secondary ? (
                <p className="mt-0.5 text-[12.5px] leading-snug text-[var(--color-muted)]/80">
                  {pulse.secondary}
                </p>
              ) : null}
            </div>

            {showSpark ? <WeekSparkline series={weekSeries} /> : null}
          </div>
        </DashboardEntrance>
      </div>
    </section>
  );
}
