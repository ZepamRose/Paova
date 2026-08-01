"use client";

import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";

type OnboardingStep = {
  id: string;
  label: string;
  completed: boolean;
  href?: string;
};

export function DashboardOnboardingHero({
  hasWaivers,
  hasSessions,
  hasSignatures,
  canManageWaivers,
  canCreateGroups,
}: {
  hasWaivers: boolean;
  hasSessions: boolean;
  hasSignatures: boolean;
  canManageWaivers: boolean;
  canCreateGroups: boolean;
}) {
  // Si tout est complété, ne rien afficher
  if (hasWaivers && hasSessions && hasSignatures) {
    return null;
  }

  const steps: OnboardingStep[] = [
    {
      id: "space",
      label: "Votre espace est créé",
      completed: true,
    },
    {
      id: "waiver",
      label: "Créer votre première décharge",
      completed: hasWaivers,
      href: canManageWaivers ? "/dashboard/waivers/new" : undefined,
    },
    {
      id: "session",
      label: "Créer votre première session",
      completed: hasSessions,
      href: canCreateGroups && hasWaivers ? "/dashboard/groupes/new" : undefined,
    },
    {
      id: "signature",
      label: "Collecter votre première signature",
      completed: hasSignatures,
    },
  ];

  const nextStep = steps.find((s) => !s.completed);
  const completedCount = steps.filter((s) => s.completed).length;

  let title = "Bienvenue sur Paova 👋";
  let subtitle = "Votre espace est prêt. Il ne reste plus que quelques étapes pour commencer.";
  let ctaLabel = "Créer ma première décharge";
  let ctaHref = "/dashboard/waivers/new";
  let ctaDisabled = false;
  let ctaDisabledReason = "";

  if (hasWaivers && !hasSessions) {
    title = "Première décharge créée ✓";
    subtitle = "Il ne reste plus que :";
    ctaLabel = "Créer ma première session";
    ctaHref = "/dashboard/groupes/new";
    ctaDisabled = !canCreateGroups;
    ctaDisabledReason = "Permission insuffisante";
  } else if (hasSessions && !hasSignatures) {
    title = "Première session créée ✓";
    subtitle = "Dernière étape :";
    ctaLabel = "Ouvrir ma session";
    ctaHref = "/dashboard/groupes";
  }

  if (!canManageWaivers && !hasWaivers) {
    ctaDisabled = true;
    ctaDisabledReason = "Seuls les propriétaires et administrateurs peuvent créer des décharges";
  }

  return (
    <div className="animate-fade-up rounded-[1.35rem] border border-[color-mix(in_srgb,var(--color-brand)_20%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-brand)_4%,var(--color-surface))] p-5 shadow-[var(--elev-2)] sm:p-6">
      <div className="flex flex-col gap-5">
        <div>
          <h2 className="text-[1.15rem] font-semibold tracking-tight text-[var(--color-foreground)] sm:text-[1.25rem]">
            {title}
          </h2>
          <p className="mt-1 text-[13.5px] text-[var(--color-muted)]">
            {subtitle}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          {steps.map((step) => (
            <div
              key={step.id}
              className="flex items-center gap-2.5 text-[13.5px]"
            >
              {step.completed ? (
                <CheckCircle2
                  size={18}
                  className="shrink-0 text-[var(--color-brand)]"
                  strokeWidth={2}
                  aria-hidden
                />
              ) : (
                <Circle
                  size={18}
                  className="shrink-0 text-[var(--color-muted)]/50"
                  strokeWidth={2}
                  aria-hidden
                />
              )}
              <span
                className={
                  step.completed
                    ? "font-medium text-[var(--color-foreground)]/70 line-through"
                    : "font-medium text-[var(--color-foreground)]"
                }
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>

        {nextStep && nextStep.href && !ctaDisabled ? (
          <Link
            href={ctaHref}
            className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-[var(--color-brand)] px-5 text-[14px] font-medium text-[var(--color-on-brand)] shadow-[0_1px_0_rgba(255,255,255,0.12)_inset,var(--elev-1)] transition-[transform,filter] duration-200 hover:-translate-y-px hover:brightness-[1.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] active:translate-y-0 active:scale-[0.99] sm:w-auto"
          >
            {ctaLabel}
          </Link>
        ) : ctaDisabled ? (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              disabled
              className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-[var(--color-surface-2)] px-5 text-[14px] font-medium text-[var(--color-foreground)]/40 sm:w-auto"
            >
              {ctaLabel}
            </button>
            {ctaDisabledReason ? (
              <p className="text-[12px] text-[var(--color-muted)]">
                {ctaDisabledReason}
              </p>
            ) : null}
          </div>
        ) : null}

        {completedCount > 0 && completedCount < steps.length ? (
          <div className="flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--color-surface-2)]">
              <div
                className="h-full rounded-full bg-[var(--color-brand)] transition-all duration-300"
                style={{ width: `${(completedCount / steps.length) * 100}%` }}
              />
            </div>
            <span className="text-[11.5px] font-medium tabular-nums text-[var(--color-muted)]">
              {completedCount}/{steps.length}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
