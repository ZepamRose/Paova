"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import type { DashboardGroupRow } from "@/lib/dashboard/types";
import {
  DashboardWaiversSection,
  type DashboardWaiverRow,
} from "../dashboard-waivers-section";
import { DashboardGroupsSection } from "../dashboard-groups-section";

function matches(haystack: string, query: string) {
  if (!query) return true;
  return haystack.toLowerCase().includes(query);
}

/**
 * Archived forms and sessions, reusing the dashboard's own sections in their
 * `archived` view. Same cards, same menus, same restore actions — an archive
 * that looked different would be a second thing to learn.
 */
export function DashboardArchives({
  archivedWaivers,
  archivedGroups,
  appUrl,
  canManageGroups,
}: {
  archivedWaivers: DashboardWaiverRow[];
  archivedGroups: DashboardGroupRow[];
  appUrl: string;
  canManageGroups: boolean;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const waivers = useMemo(
    () => archivedWaivers.filter((t) => matches(t.title, q)),
    [archivedWaivers, q],
  );
  const groups = useMemo(
    () =>
      archivedGroups.filter(
        (g) => matches(g.name, q) || matches(g.template_title, q),
      ),
    [archivedGroups, q],
  );

  const total = archivedWaivers.length + archivedGroups.length;
  const showSearch = total >= 3 || q.length > 0;

  return (
    <div className="flex flex-col gap-5">
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
            placeholder="Rechercher dans les archives…"
            aria-label="Rechercher dans les archives"
            className="h-[42px] w-full rounded-xl border border-[color-mix(in_srgb,var(--color-border)_55%,transparent)] bg-[var(--color-surface)] py-2 pl-9 pr-9 text-[13.5px] text-[var(--color-foreground)] outline-none transition-[border-color,box-shadow] placeholder:text-[var(--color-muted)]/70 focus:border-[var(--color-brand)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-brand)_16%,transparent)]"
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

      {archivedWaivers.length > 0 ? (
        <DashboardWaiversSection
          active={[]}
          archived={waivers}
          listView="archived"
          appUrl={appUrl}
          signatureCountByTemplate={{}}
          lastSignedByTemplate={{}}
          searchActive={Boolean(q)}
        />
      ) : null}

      {archivedWaivers.length > 0 && archivedGroups.length > 0 ? (
        <div aria-hidden className="my-1 flex items-center gap-3">
          <span className="h-px flex-1 bg-[color-mix(in_srgb,var(--color-border)_55%,transparent)]" />
          <span className="h-1 w-1 rounded-full bg-[color-mix(in_srgb,var(--color-border)_80%,var(--color-muted))]" />
          <span className="h-px flex-1 bg-[color-mix(in_srgb,var(--color-border)_55%,transparent)]" />
        </div>
      ) : null}

      {archivedGroups.length > 0 ? (
        <DashboardGroupsSection
          groups={[]}
          archivedGroups={groups}
          listView="archived"
          searchActive={Boolean(q)}
          appUrl={appUrl}
          canCreateGroup={false}
          canCreateGroups={false}
          canManageGroups={canManageGroups}
        />
      ) : null}
    </div>
  );
}
