"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import type {
  DashboardAttentionItem,
  DashboardGroupRow,
} from "@/lib/dashboard/types";
import { DashboardAttention } from "./dashboard-activity-slot";
import {
  DashboardWaiversSection,
  type DashboardWaiverRow,
} from "./dashboard-waivers-section";
import { DashboardGroupsSection } from "./dashboard-groups-section";
import { DashboardEntrance } from "./dashboard-entrance";
import { DashboardSessionsView } from "./dashboard-sessions-view";
import { DashboardTodayHero } from "./dashboard-today-hero";
import { SessionsPanel } from "./sessions-panel";
import { SessionsSidebar } from "./sessions-sidebar";
import type { RecentSignature } from "./sessions-signatures-action";

function matchesQuery(haystack: string, query: string) {
  if (!query) return true;
  return haystack.toLowerCase().includes(query);
}

/**
 * PAOVA V2 - Dashboard Home
 *
 * Nouvelle organisation centrée sur les sessions.
 * Les sessions sont au premier plan, les modèles en arrière-plan.
 */
export function DashboardHome({
  attentionItems,
  active,
  groups,
  appUrl,
  signatureCountByTemplate,
  lastSignedByTemplate,
  canCreateGroups,
  canManageGroups,
  templateChoices = [],
  businessId,
  initialSignatures = [],
}: {
  attentionItems: DashboardAttentionItem[];
  active: DashboardWaiverRow[];
  groups: DashboardGroupRow[];
  appUrl: string;
  signatureCountByTemplate: Record<string, number>;
  lastSignedByTemplate: Record<string, string>;
  canCreateGroups: boolean;
  canManageGroups: boolean;
  templateChoices?: Array<{ id: string; title: string }>;
  businessId: string;
  initialSignatures?: RecentSignature[];
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const filteredActive = useMemo(
    () => active.filter((t) => matchesQuery(t.title, q)),
    [active, q],
  );
  const filteredGroups = useMemo(
    () =>
      groups.filter(
        (g) =>
          matchesQuery(g.name, q) || matchesQuery(g.template_title, q),
      ),
    [groups, q],
  );

  const showSearch = active.length + groups.length >= 3 || q.length > 0;

  return (
    <div className="flex flex-col gap-4 sm:gap-4">
      {!q ? (
        <>
          <DashboardTodayHero groups={groups} />
          <DashboardAttention items={attentionItems} />
        </>
      ) : null}

      {showSearch ? (
        <DashboardEntrance
          step={2}
          className="flex flex-col gap-2.5 rounded-xl border border-[color-mix(in_srgb,var(--color-border)_50%,transparent)] bg-[color-mix(in_srgb,var(--color-surface-2)_20%,var(--color-background))] p-2.5 sm:p-3"
        >
          <div className="relative">
            <Search
              size={14}
              strokeWidth={2}
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]/80"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher une session ou un modèle…"
              className="h-[40px] w-full rounded-lg border border-[color-mix(in_srgb,var(--color-border)_52%,transparent)] bg-[var(--color-surface)] py-2 pl-9 pr-9 text-[13px] text-[var(--color-foreground)] outline-none transition-[border-color,box-shadow] placeholder:text-[var(--color-muted)]/65 focus:border-[var(--color-brand)] focus:shadow-[0_0_0_2.5px_color-mix(in_srgb,var(--color-brand)_15%,transparent)]"
              aria-label="Rechercher"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Effacer la recherche"
                className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-lg text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)]"
              >
                <X size={13} strokeWidth={2.2} aria-hidden />
              </button>
            ) : null}
          </div>
        </DashboardEntrance>
      ) : null}

      {/* Vue Sessions — layout 2 colonnes */}
      {!q && (
        <DashboardEntrance step={3} className="flex flex-col">
          <div className="flex items-start gap-5">
            {/* Colonne principale : onglets + liste/cartes */}
            <div className="min-w-0 flex-1">
              <SessionsPanel groups={filteredGroups} appUrl={appUrl} />
            </div>
            {/* Colonne latérale : stats du jour + dernières signatures */}
            <SessionsSidebar
              groups={groups}
              businessId={businessId}
              initialSignatures={initialSignatures}
            />
          </div>
        </DashboardEntrance>
      )}

      {/* Vue recherche */}
      {q && (
        <>
          <DashboardEntrance step={3} className="flex flex-col">
            <DashboardGroupsSection
              groups={filteredGroups}
              archivedGroups={[]}
              listView="active"
              searchActive={Boolean(q)}
              appUrl={appUrl}
              canCreateGroup={active.length > 0}
              canCreateGroups={canCreateGroups}
              canManageGroups={canManageGroups}
              templateChoices={templateChoices}
            />
          </DashboardEntrance>

          <div
            aria-hidden
            className="my-2 flex items-center gap-3 sm:my-3"
          >
            <span className="h-px flex-1 bg-[color-mix(in_srgb,var(--color-border)_55%,transparent)]" />
            <span className="h-1 w-1 rounded-full bg-[color-mix(in_srgb,var(--color-border)_80%,var(--color-muted))]" />
            <span className="h-px flex-1 bg-[color-mix(in_srgb,var(--color-border)_55%,transparent)]" />
          </div>

          <DashboardEntrance step={4} className="flex flex-col">
            <DashboardWaiversSection
              active={filteredActive}
              archived={[]}
              listView="active"
              appUrl={appUrl}
              signatureCountByTemplate={signatureCountByTemplate}
              lastSignedByTemplate={lastSignedByTemplate}
              searchActive={Boolean(q)}
            />
          </DashboardEntrance>
        </>
      )}
    </div>
  );
}
