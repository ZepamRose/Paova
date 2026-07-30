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

function matchesQuery(haystack: string, query: string) {
  if (!query) return true;
  return haystack.toLowerCase().includes(query);
}

/**
 * Client shell below the business hero. One live view: search, forms,
 * planned sessions. Archives are a page of their own.
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
}: {
  attentionItems: DashboardAttentionItem[];
  active: DashboardWaiverRow[];
  groups: DashboardGroupRow[];
  appUrl: string;
  signatureCountByTemplate: Record<string, number>;
  lastSignedByTemplate: Record<string, string>;
  canCreateGroups: boolean;
  canManageGroups: boolean;
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

  const canCreateGroup = active.length > 0;

  return (
    <div className="flex flex-col gap-5 sm:gap-5">
      {!q ? (
        <DashboardAttention items={attentionItems} />
      ) : null}

      <DashboardEntrance
        step={2}
        className="flex flex-col gap-2.5 rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_52%,transparent)] bg-[color-mix(in_srgb,var(--color-surface-2)_22%,var(--color-background))] p-2.5 sm:p-3"
      >
        {/* Search alone. The Actives/Archivées switch is gone — archives now
            live behind the header tile, so this list only ever shows live
            work and there is nothing left to toggle between. */}
        {showSearch ? (
          <div className="relative">
            <Search
              size={15}
              strokeWidth={1.9}
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un formulaire ou une session…"
              className="h-[42px] w-full rounded-xl border border-[color-mix(in_srgb,var(--color-border)_55%,transparent)] bg-[var(--color-surface)] py-2 pl-9 pr-9 text-[13.5px] text-[var(--color-foreground)] outline-none transition-[border-color,box-shadow] placeholder:text-[var(--color-muted)]/70 focus:border-[var(--color-brand)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-brand)_16%,transparent)]"
              aria-label="Rechercher"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Effacer la recherche"
                className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)]"
              >
                <X size={14} strokeWidth={2} aria-hidden />
              </button>
            ) : null}
          </div>
        ) : null}
      </DashboardEntrance>

      <DashboardEntrance step={3} className="flex flex-col">
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

      <div
        aria-hidden
        className="my-2 flex items-center gap-3 sm:my-3"
      >
        <span className="h-px flex-1 bg-[color-mix(in_srgb,var(--color-border)_55%,transparent)]" />
        <span className="h-1 w-1 rounded-full bg-[color-mix(in_srgb,var(--color-border)_80%,var(--color-muted))]" />
        <span className="h-px flex-1 bg-[color-mix(in_srgb,var(--color-border)_55%,transparent)]" />
      </div>

      <DashboardEntrance step={4} className="flex flex-col">
        <DashboardGroupsSection
          groups={filteredGroups}
          archivedGroups={[]}
          listView="active"
          searchActive={Boolean(q)}
          appUrl={appUrl}
          canCreateGroup={canCreateGroup}
          canCreateGroups={canCreateGroups}
          canManageGroups={canManageGroups}
        />
      </DashboardEntrance>
    </div>
  );
}
