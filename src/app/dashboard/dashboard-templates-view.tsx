"use client";

import Link from "next/link";
import { FileText } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import type { DashboardWaiverRow } from "./dashboard-waivers-section";
import { effectiveTemplateStatus, isTemplateStatus } from "@/lib/templates";

/**
 * PAOVA V2 - Templates View
 *
 * Les formulaires deviennent des "modèles".
 * Affichage secondaire orienté vers l'utilisation dans les sessions.
 */

type TemplateCardProps = {
  template: DashboardWaiverRow;
  sessionCount: number;
  lastUsed: string | null;
  signatureCount: number;
};

function TemplateCard({ template, sessionCount, signatureCount }: TemplateCardProps) {
  // Valider et normaliser le status
  const templateStatus = isTemplateStatus(template.status) ? template.status : "inactive";
  const status = effectiveTemplateStatus({
    status: templateStatus,
    expires_at: template.expires_at,
  });

  return (
    <Link
      href={`/dashboard/waivers/${template.id}`}
      className="group block rounded-lg border border-[color-mix(in_srgb,var(--color-border)_55%,transparent)] bg-[var(--color-surface)] p-2.5 shadow-[var(--elev-1)] transition-[border-color] duration-[150ms] hover:border-[color-mix(in_srgb,var(--color-border)_80%,transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-[13.5px] font-medium tracking-tight text-[var(--color-foreground)] truncate">
            {template.title}
          </h3>
          <div className="flex items-center gap-1.5 mt-0.5">
            <StatusBadge status={status} showDot={true} />
          </div>
        </div>

        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[color-mix(in_srgb,var(--color-muted)_6%,transparent)] text-[var(--color-muted)]/70">
          <FileText size={13} strokeWidth={1.8} />
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[var(--color-muted)]">
        {sessionCount > 0 && (
          <>
            <span className="font-medium tabular-nums text-[var(--color-foreground)]">{sessionCount}</span>
            <span>session{sessionCount > 1 ? "s" : ""}</span>
          </>
        )}

        {signatureCount > 0 && (
          <>
            {sessionCount > 0 && <span className="text-[var(--color-muted)]/35">·</span>}
            <span className="font-medium tabular-nums text-[var(--color-foreground)]">{signatureCount}</span>
            <span>signature{signatureCount > 1 ? "s" : ""}</span>
          </>
        )}
      </div>
    </Link>
  );
}

export function DashboardTemplatesView({
  templates,
  signatureCountByTemplate,
  lastSignedByTemplate,
  groupsByTemplate,
}: {
  templates: DashboardWaiverRow[];
  signatureCountByTemplate: Record<string, number>;
  lastSignedByTemplate: Record<string, string>;
  groupsByTemplate: Record<string, number>;
}) {
  if (templates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--color-muted)_8%,transparent)]">
          <FileText size={24} className="text-[var(--color-muted)]" />
        </div>
        <p className="text-[15px] font-semibold text-[var(--color-foreground)]">
          Aucun modèle
        </p>
        <p className="mt-1.5 text-[13.5px] text-[var(--color-muted)]">
          Créez un modèle pour démarrer vos sessions
        </p>
      </div>
    );
  }

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[color-mix(in_srgb,var(--color-muted)_8%,transparent)] text-[var(--color-muted)]/70">
          <FileText size={13} strokeWidth={1.8} />
        </span>
        <div>
          <h2 className="text-[13.5px] font-medium tracking-tight text-[var(--color-muted)]">
            Modèles de formulaire
          </h2>
          <p className="text-[11px] text-[var(--color-muted)]/75 mt-0.5">
            {templates.length} modèle{templates.length > 1 ? "s" : ""} disponible{templates.length > 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {templates.map(template => (
          <TemplateCard
            key={template.id}
            template={template}
            sessionCount={groupsByTemplate[template.id] || 0}
            lastUsed={lastSignedByTemplate[template.id] || null}
            signatureCount={signatureCountByTemplate[template.id] || 0}
          />
        ))}
      </div>
    </section>
  );
}
