"use client";

import { motion, useReducedMotion } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Group progress — the signal an employee reads in under one second.
 * Dashboard variant elevates the bar; compact stays for denser contexts.
 */
export function GroupProgressBar({
  signed,
  total,
  className = "",
  variant = "default",
}: {
  signed: number;
  total: number;
  className?: string;
  variant?: "default" | "dashboard";
}) {
  const pct = total > 0 ? Math.min(100, Math.round((signed / total) * 100)) : 0;
  const pending = Math.max(0, total - signed);
  const complete = total > 0 && pending === 0;
  const dashboard = variant === "dashboard";
  const reduced = useReducedMotion() ?? false;

  if (dashboard) {
    return (
      <div className={className}>
        <div className="flex items-end justify-between gap-3">
          <p className="min-w-0 text-[12.5px] leading-none tracking-tight">
            <span className="font-semibold tabular-nums text-[var(--color-foreground)]">
              {signed}
            </span>
            <span className="tabular-nums text-[var(--color-muted)]">
              {" "}
              / {total}
            </span>
            <span className="ml-1 text-[var(--color-muted)]">signés</span>
            {pending > 0 ? (
              <span className="ml-1.5 text-[var(--color-muted)]">
                <span
                  aria-hidden
                  className="mr-1.5 text-[var(--color-muted)]/40"
                >
                  ·
                </span>
                {pending} restant{pending > 1 ? "s" : ""}
              </span>
            ) : null}
          </p>
          {/* Une session complète est le seul état qui appelle une action :
              plus rien à relancer. Elle mérite une pastille pleine, pas une
              mention en gris parmi d'autres. Sinon, le pourcentage suffit. */}
          {complete ? (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[var(--color-brand)] px-2.5 py-1 text-[11px] font-semibold leading-4 tracking-[0.01em] text-[var(--color-on-brand)] shadow-[0_1px_0_rgba(255,255,255,0.14)_inset]">
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="m5 13 4 4L19 7" />
              </svg>
              Complète
            </span>
          ) : (
            <p className="shrink-0 text-[17px] font-semibold leading-none tabular-nums tracking-tight text-[var(--color-foreground)]">
              {total === 0 ? "—" : `${pct}%`}
            </p>
          )}
        </div>
        <div
          className="mt-2 h-2.5 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--color-brand)_10%,var(--color-surface-2))] ring-1 ring-[color-mix(in_srgb,var(--color-brand)_12%,transparent)]"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${signed} sur ${total} signatures`}
        >
          <motion.div
            className="h-full rounded-full bg-[var(--color-brand)]"
            initial={reduced ? false : { width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.55, delay: 0.08, ease: EASE }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[12.5px] font-medium tabular-nums tracking-tight text-[var(--color-foreground)]">
          <span className="font-semibold">{signed}</span>
          <span className="font-normal text-[var(--color-muted)]">
            {" "}
            / {total}
          </span>
          <span className="ml-1.5 font-normal text-[var(--color-muted)]">
            signés
          </span>
        </p>
        <p
          className={`text-[11.5px] font-semibold tabular-nums ${
            complete
              ? "text-[var(--color-brand)]"
              : "text-[var(--color-muted)]"
          }`}
        >
          {total === 0 ? "—" : `${pct} %`}
        </p>
      </div>
      <div
        className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--color-surface-2)_88%,var(--color-foreground))]"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${signed} sur ${total} signatures`}
      >
        <div
          className="h-full rounded-full bg-[var(--color-brand)] transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function GroupStatBadges({
  total,
  signed,
  status,
  className = "",
}: {
  total: number;
  signed: number;
  status?: string;
  className?: string;
}) {
  const pending = Math.max(0, total - signed);
  const complete = total > 0 && pending === 0;
  const pct = total > 0 ? Math.round((signed / total) * 100) : 0;

  const chip =
    "inline-flex items-center rounded-md px-1.5 py-0.5 text-[10.5px] font-medium leading-4 tracking-tight";

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      <span
        className={`${chip} bg-[var(--color-surface-2)] text-[var(--color-muted)]`}
      >
        {total} participant{total === 1 ? "" : "s"}
      </span>
      <span
        className={`${chip} bg-[color-mix(in_srgb,var(--color-brand)_12%,transparent)] text-[var(--color-brand)]`}
      >
        {signed} signé{signed === 1 ? "" : "s"}
      </span>
      {pending > 0 ? (
        <span
          className={`${chip} bg-[var(--color-surface-2)] text-[var(--color-muted)]`}
        >
          {pending} en attente
        </span>
      ) : null}
      {complete ? (
        <span
          className={`${chip} bg-[color-mix(in_srgb,var(--color-brand)_14%,transparent)] text-[var(--color-brand)]`}
        >
          Terminé · 100 %
        </span>
      ) : total > 0 ? (
        <span
          className={`${chip} bg-[var(--color-surface-2)] text-[var(--color-muted)]`}
        >
          {pct} %
        </span>
      ) : null}
      {status === "closed" ? (
        <span
          className={`${chip} bg-[var(--color-surface-2)] text-[var(--color-muted)]`}
        >
          Fermé
        </span>
      ) : null}
      {status === "archived" ? (
        <span
          className={`${chip} bg-[var(--color-surface-2)] text-[var(--color-muted)]/80`}
        >
          Archivé
        </span>
      ) : null}
    </div>
  );
}
