"use client";

import { useState } from "react";
import { CheckCircle2, Circle, PartyPopper } from "lucide-react";

type OnboardingStep = {
  id: string;
  label: string;
  completed: boolean;
};

export function DashboardOnboardingHero({
  hasWaivers,
  hasSessions,
  canManageWaivers,
  canCreateGroups,
  firstSessionId,
}: {
  hasWaivers: boolean;
  hasSessions: boolean;
  canManageWaivers: boolean;
  canCreateGroups: boolean;
  firstSessionId: string | null;
}) {
  const [dismissed, setDismissed] = useState(false);

  // Si tout est complété, afficher la carte de félicitations
  if (hasWaivers && hasSessions) {
    if (dismissed) return null;

    return (
      <div className="animate-fade-up rounded-[1.35rem] border border-[color-mix(in_srgb,var(--color-brand)_20%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-brand)_4%,var(--color-surface))] p-5 shadow-[var(--elev-2)] sm:p-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--color-brand)_15%,var(--color-surface))]">
              <PartyPopper size={20} className="text-[var(--color-brand)]" strokeWidth={2} />
            </div>
            <div className="flex-1">
              <h2 className="text-[1.15rem] font-semibold tracking-tight text-[var(--color-foreground)] sm:text-[1.25rem]">
                🎉 Votre espace est prêt
              </h2>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-[var(--color-muted)]">
                Votre première session est créée. Vous pouvez commencer à collecter des signatures dès que vos participants seront présents.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {firstSessionId ? (
              <a
                href={`/dashboard/groupes/${firstSessionId}`}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-[var(--color-brand)] px-5 text-[13.5px] font-medium text-[var(--color-on-brand)] shadow-[0_1px_0_rgba(255,255,255,0.12)_inset,var(--elev-1)] transition-[transform,filter] duration-200 hover:-translate-y-px hover:brightness-[1.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] active:translate-y-0 active:scale-[0.99]"
              >
                Ouvrir la session
              </a>
            ) : null}
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--color-border)_70%,transparent)] bg-[var(--color-surface)] px-5 text-[13.5px] font-medium text-[var(--color-foreground)] shadow-[var(--elev-1)] transition-[background-color,border-color,transform] duration-200 hover:border-[color-mix(in_srgb,var(--color-brand)_25%,var(--color-border))] hover:bg-[var(--color-surface-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]"
            >
              Retour au tableau de bord
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Sinon, afficher l'onboarding progressif
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
    },
    {
      id: "session",
      label: "Créer votre première session",
      completed: hasSessions,
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;

  let title = "Bienvenue sur Paova 👋";
  let subtitle = "Votre espace est prêt. Il ne reste plus que quelques étapes pour commencer.";
  let ctaLabel = "Créer ma première décharge";
  const ctaHref = "/dashboard/waivers/new";
  let ctaType: "link" | "button" | "none" = "link";
  let ctaDisabled = false;
  let ctaDisabledReason = "";

  if (hasWaivers && !hasSessions) {
    title = "Première décharge créée ✓";
    subtitle = "Il ne reste plus que :";
    ctaLabel = "Créer ma première session";
    ctaType = canCreateGroups ? "button" : "none";
    ctaDisabled = !canCreateGroups;
    ctaDisabledReason = "Permission insuffisante";
  }

  if (!canManageWaivers && !hasWaivers) {
    ctaType = "none";
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

        {ctaType === "link" && !ctaDisabled ? (
          <a
            href={ctaHref}
            className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-[var(--color-brand)] px-5 text-[14px] font-medium text-[var(--color-on-brand)] shadow-[0_1px_0_rgba(255,255,255,0.12)_inset,var(--elev-1)] transition-[transform,filter] duration-200 hover:-translate-y-px hover:brightness-[1.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] active:translate-y-0 active:scale-[0.99] sm:w-auto"
          >
            {ctaLabel}
          </a>
        ) : ctaType === "button" && !ctaDisabled ? (
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('open-new-session-modal'))}
            className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-[var(--color-brand)] px-5 text-[14px] font-medium text-[var(--color-on-brand)] shadow-[0_1px_0_rgba(255,255,255,0.12)_inset,var(--elev-1)] transition-[transform,filter] duration-200 hover:-translate-y-px hover:brightness-[1.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)] active:translate-y-0 active:scale-[0.99] sm:w-auto"
          >
            {ctaLabel}
          </button>
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
